import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendPushNotification } from '@/lib/push';
import { resolveLocale } from '@/lib/i18n-messages';
import { stripRichText } from '@/lib/notifications';

const PUSH_BODY_MAX = 180;

interface AnnouncementForPush {
  id: string;
  title: string;
  body: string;
  translations: Record<string, { title?: string; body?: string }> | null;
  audience: 'all' | 'hu';
}

/**
 * Sends an announcement as push to every subscribed device of its audience,
 * in each user's language. The announcement is claimed first (push_sent_at),
 * so two overlapping cron runs or a double click never send it twice.
 * Needs a service-role client.
 */
export async function sendAnnouncementPush(service: SupabaseClient, announcement: AnnouncementForPush) {
  const { data: claimed } = await service
    .from('announcements')
    .update({ push_sent_at: new Date().toISOString() })
    .eq('id', announcement.id)
    .is('push_sent_at', null)
    .select('id')
    .maybeSingle();
  if (!claimed) return { sent: 0, devices: 0 };

  let profilesQuery = service.from('profiles').select('id, preferred_language').eq('push_enabled', true);
  if (announcement.audience === 'hu') profilesQuery = profilesQuery.eq('preferred_language', 'hu');
  const { data: profiles } = await profilesQuery;
  if (!profiles?.length) return { sent: 0, devices: 0 };

  const localeOf = new Map(profiles.map((p) => [p.id, resolveLocale(p.preferred_language)]));
  const { data: subs } = await service
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', [...localeOf.keys()]);

  let sent = 0;
  const stale: { user_id: string; endpoint: string }[] = [];
  for (const sub of subs ?? []) {
    const locale = localeOf.get(sub.user_id) ?? 'hu';
    const tr = announcement.translations?.[locale];
    const body = stripRichText(tr?.body || announcement.body);
    try {
      await sendPushNotification(sub, {
        title: tr?.title || announcement.title,
        body: body.length > PUSH_BODY_MAX ? `${body.slice(0, PUSH_BODY_MAX - 1)}…` : body,
        url: `/${locale}/ertesitesek#n-${announcement.id}`,
      });
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) stale.push({ user_id: sub.user_id, endpoint: sub.endpoint });
    }
  }
  for (const s of stale) {
    await service.from('push_subscriptions').delete().eq('user_id', s.user_id).eq('endpoint', s.endpoint);
  }
  return { sent, devices: subs?.length ?? 0 };
}

/** Scheduled announcements whose publish time has come: send their push (cron). */
export async function sendDueAnnouncementPushes(service: SupabaseClient) {
  const now = new Date().toISOString();
  const { data, error } = await service
    .from('announcements')
    .select('id, title, body, translations, audience, expires_at')
    .eq('send_push', true)
    .is('push_sent_at', null)
    .not('publish_at', 'is', null)
    .lte('publish_at', now);
  // Table missing (migration 013 not run): nothing to do
  if (error || !data?.length) return 0;

  let sent = 0;
  for (const a of data) {
    if (a.expires_at && a.expires_at <= now) continue;
    sent += (await sendAnnouncementPush(service, a as AnnouncementForPush)).sent;
  }
  return sent;
}
