import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/push';
import {
  DEFAULT_ANGOL_PUSH_TIME,
  DEFAULT_MAGIA_PUSH_TIME,
  DEFAULT_MAGIA_EVENING_PUSH_TIME,
  DEFAULT_MAGIA_STREAK_PUSH_TIME,
} from '@/lib/locale-meta';
import {
  getBudapestNow,
  hasAngolActivityToday,
  hasMagiaActivityToday,
  getMagiaInactiveDays,
  isReminderDue,
} from '@/lib/push-reminders';
import { getMessage, resolveLocale } from '@/lib/i18n-messages';
import type { Locale } from '@/i18n';
import { countReviewQueue, type CardScheduleRow } from '@/lib/angol-srs';
import { sendDueAnnouncementPushes } from '@/lib/announcement-push';
import { practiceDate } from '@/lib/magia/path';
import vocabulary from '@/messages/content/angol-vocabulary.json';

const VOCABULARY_SIZE = (vocabulary as unknown[]).length;

interface ProfileRow {
  id: string;
  push_enabled: boolean;
  push_magia_reminders: boolean;
  push_magia_time: string | null;
  push_magia_evening: boolean;
  push_magia_evening_time: string | null;
  push_magia_streak: boolean;
  push_magia_streak_time: string | null;
  push_magia_reengagement: boolean;
  last_magia_push_date: string | null;
  last_magia_evening_push_date: string | null;
  last_magia_streak_push_date: string | null;
  last_magia_reengagement_date: string | null;
  last_magia_activity_date: string | null;
  push_angol_reminders: boolean;
  push_angol_time: string | null;
  preferred_language: string;
  last_angol_push_date: string | null;
}

type NotificationType =
  | 'magia_morning'
  | 'magia_evening'
  | 'magia_streak'
  | 'magia_reengagement'
  | 'angol';

interface PushPayload {
  type: NotificationType;
  title: string;
  body: string;
  url: string;
}

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

/** Fehér Mágia: the completed evenings of the open 14-day cycle, if tonight is its last one. */
async function cycleLastEvening(supabase: ServiceClient, userId: string, today: string): Promise<number | null> {
  const { data: cycle } = await supabase
    .from('magia_cycles')
    .select('id, length_days')
    .eq('user_id', userId)
    .is('closed_at', null)
    .maybeSingle();
  if (!cycle) return null;
  const { data: evenings } = await supabase
    .from('magia_evenings')
    .select('obs_date')
    .eq('user_id', userId)
    .eq('cycle_id', cycle.id)
    .not('completed_at', 'is', null);
  const rows = (evenings ?? []) as { obs_date: string }[];
  if (rows.some((e) => e.obs_date === today)) return null;
  return rows.length === cycle.length_days - 1 ? cycle.length_days : null;
}

async function buildPushNotifications(
  profile: ProfileRow,
  budapestNow: ReturnType<typeof getBudapestNow>,
  supabase: ServiceClient,
  /** Users with Kreatív Angol access (locked module) */
  angolUsers: Set<string>
): Promise<PushPayload[]> {
  const locale = resolveLocale(profile.preferred_language);
  const notifications: PushPayload[] = [];
  const magiaUrl = `/${locale}/modules/magia/ma`;

  const magiaTime = profile.push_magia_time || DEFAULT_MAGIA_PUSH_TIME;
  const morningAlreadySent = profile.last_magia_push_date === budapestNow.date;
  if (
    profile.push_magia_reminders &&
    !morningAlreadySent &&
    isReminderDue(budapestNow.totalMinutes, magiaTime)
  ) {
    notifications.push({
      type: 'magia_morning',
      title: await getMessage(locale, 'push.morningTitle'),
      body: await getMessage(locale, 'push.morningBody'),
      url: magiaUrl,
    });
  }

  const eveningTime = profile.push_magia_evening_time || DEFAULT_MAGIA_EVENING_PUSH_TIME;
  const eveningAlreadySent = profile.last_magia_evening_push_date === budapestNow.date;
  if (
    profile.push_magia_evening &&
    !eveningAlreadySent &&
    isReminderDue(budapestNow.totalMinutes, eveningTime)
  ) {
    // On the cycle's last evening: "Ma zárul a 14 napod"
    const cycleDays = await cycleLastEvening(supabase, profile.id, practiceDate(new Date()));
    notifications.push({
      type: 'magia_evening',
      title: await getMessage(locale, 'push.eveningTitle'),
      body: cycleDays
        ? await getMessage(locale, 'push.cycleLastEveningBody', { days: cycleDays })
        : await getMessage(locale, 'push.eveningBody'),
      url: magiaUrl,
    });
  }

  const streakTime = profile.push_magia_streak_time || DEFAULT_MAGIA_STREAK_PUSH_TIME;
  const streakAlreadySent = profile.last_magia_streak_push_date === budapestNow.date;
  if (
    profile.push_magia_streak &&
    !streakAlreadySent &&
    isReminderDue(budapestNow.totalMinutes, streakTime)
  ) {
    const hasActivity = await hasMagiaActivityToday(supabase, profile.id, budapestNow.date);
    if (!hasActivity) {
      notifications.push({
        type: 'magia_streak',
        title: await getMessage(locale, 'push.streakTitle'),
        body: await getMessage(locale, 'push.streakBody'),
        url: magiaUrl,
      });
    }
  }

  // Re-engagement only makes sense for users who have practiced before;
  // without a last activity date the "inactive days" count would be bogus.
  if (
    profile.push_magia_reengagement &&
    profile.last_magia_activity_date &&
    isReminderDue(budapestNow.totalMinutes, '10:00')
  ) {
    const inactiveDays = await getMagiaInactiveDays(
      profile.last_magia_activity_date,
      budapestNow.date
    );
    if (inactiveDays >= 3) {
      const daysSinceReengagement = await getMagiaInactiveDays(
        profile.last_magia_reengagement_date,
        budapestNow.date
      );
      if (daysSinceReengagement >= 7) {
        notifications.push({
          type: 'magia_reengagement',
          title: await getMessage(locale, 'push.reengagementTitle'),
          body: await getMessage(locale, 'push.reengagementBody', { days: inactiveDays }),
          url: magiaUrl,
        });
      }
    }
  }

  const angolTime = profile.push_angol_time || DEFAULT_ANGOL_PUSH_TIME;
  const angolDue =
    profile.push_angol_reminders &&
    profile.preferred_language === 'hu' &&
    angolUsers.has(profile.id) &&
    isReminderDue(budapestNow.totalMinutes, angolTime);
  const alreadySentAngolToday = profile.last_angol_push_date === budapestNow.date;

  if (angolDue && !alreadySentAngolToday) {
    const completedToday = await hasAngolActivityToday(supabase, profile.id, budapestNow.date);
    if (!completedToday) {
      // Mention today's vocabulary review when the schedule (migration 009) exists
      const { data: cardRows, error: cardError } = await supabase
        .from('angol_card_progress')
        .select('word_hu, due_on, introduced_on')
        .eq('user_id', profile.id);
      const reviewCount = cardError
        ? 0
        : countReviewQueue(VOCABULARY_SIZE, (cardRows ?? []) as CardScheduleRow[], budapestNow.date);
      notifications.push({
        type: 'angol',
        title: await getMessage(locale as Locale, 'push.angolTitle'),
        body:
          reviewCount > 0
            ? await getMessage(locale as Locale, 'push.angolReviewBody', { count: reviewCount })
            : await getMessage(locale as Locale, 'push.angolBody'),
        url: `/${locale}/modules/angol`,
      });
    }
  }

  return notifications;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[push/send] CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const budapestNow = getBudapestNow();

  // Announcements whose scheduled publish time has come (migration 013)
  let announcementsSent = 0;
  try {
    announcementsSent = await sendDueAnnouncementPushes(supabase);
  } catch (err) {
    console.error('[push/send] announcement push failed:', err);
  }

  const baseColumns =
    'id, push_enabled, push_magia_reminders, push_magia_time, push_magia_evening, push_magia_evening_time, push_magia_streak, push_magia_streak_time, push_magia_reengagement, last_magia_push_date, last_magia_evening_push_date, last_magia_streak_push_date, last_magia_reengagement_date, last_magia_activity_date, push_angol_reminders, push_angol_time, preferred_language, last_angol_push_date';
  const { data: profiles, error } = await supabase.from('profiles').select(baseColumns).eq('push_enabled', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profiles?.length) {
    return NextResponse.json({ sent: 0, checked: 0, announcementsSent, budapest: budapestNow });
  }

  // Kreatív Angol is locked: reminders only for users with access and admins
  // (migration 016; no reminders at all until it has been run)
  const [accessRows, adminRows] = await Promise.all([
    supabase.from('module_access').select('user_id').eq('module', 'angol'),
    supabase.from('admins').select('user_id'),
  ]);
  const angolUsers = new Set<string>(
    accessRows.error ? [] : [...(accessRows.data ?? []), ...(adminRows.data ?? [])].map((r) => (r as { user_id: string }).user_id)
  );

  let sent = 0;
  let staleRemoved = 0;

  for (const profile of profiles as unknown as ProfileRow[]) {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', profile.id);

    if (!subscriptions?.length) continue;

    const notifications = await buildPushNotifications(profile, budapestNow, supabase, angolUsers);
    if (!notifications.length) continue;

    let angolSent = false;
    let magiaMorningSent = false;
    let magiaEveningSent = false;
    let magiaStreakSent = false;
    let magiaReengagementSent = false;
    const staleEndpoints = new Set<string>();

    for (const sub of subscriptions) {
      if (staleEndpoints.has(sub.endpoint)) continue;

      for (const notif of notifications) {
        try {
          await sendPushNotification(sub, notif);
          sent++;
          if (notif.type === 'angol') angolSent = true;
          if (notif.type === 'magia_morning') magiaMorningSent = true;
          if (notif.type === 'magia_evening') magiaEveningSent = true;
          if (notif.type === 'magia_streak') magiaStreakSent = true;
          if (notif.type === 'magia_reengagement') magiaReengagementSent = true;
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 410 || statusCode === 404) {
            // iOS/FCM invalidated this subscription — remove it so we stop
            // retrying and the UI toggle reflects the broken state.
            staleEndpoints.add(sub.endpoint);
            break;
          }
          console.error('[push/send] send failed', {
            type: notif.type,
            statusCode,
            body: (err as { body?: string }).body,
            endpoint: sub.endpoint.slice(0, 60),
          });
        }
      }
    }

    if (staleEndpoints.size > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', profile.id)
        .in('endpoint', Array.from(staleEndpoints));
      staleRemoved += staleEndpoints.size;
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (angolSent) updates.last_angol_push_date = budapestNow.date;
    if (magiaMorningSent) updates.last_magia_push_date = budapestNow.date;
    if (magiaEveningSent) updates.last_magia_evening_push_date = budapestNow.date;
    if (magiaStreakSent) updates.last_magia_streak_push_date = budapestNow.date;
    if (magiaReengagementSent) updates.last_magia_reengagement_date = budapestNow.date;

    if (Object.keys(updates).length > 1) {
      await supabase.from('profiles').update(updates).eq('id', profile.id);
    }
  }

  return NextResponse.json({
    sent,
    checked: profiles.length,
    staleRemoved,
    announcementsSent,
    budapest: budapestNow,
  });
}