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

async function buildPushNotifications(
  profile: ProfileRow,
  budapestNow: ReturnType<typeof getBudapestNow>,
  supabase: Awaited<ReturnType<typeof createServiceClient>>
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
    notifications.push({
      type: 'magia_evening',
      title: await getMessage(locale, 'push.eveningTitle'),
      body: await getMessage(locale, 'push.eveningBody'),
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

  if (
    profile.push_magia_reengagement &&
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
    isReminderDue(budapestNow.totalMinutes, angolTime);
  const alreadySentAngolToday = profile.last_angol_push_date === budapestNow.date;

  if (angolDue && !alreadySentAngolToday) {
    const completedToday = await hasAngolActivityToday(supabase, profile.id, budapestNow.date);
    if (!completedToday) {
      notifications.push({
        type: 'angol',
        title: await getMessage(locale as Locale, 'push.angolTitle'),
        body: await getMessage(locale as Locale, 'push.angolBody'),
        url: `/${locale}/modules/angol`,
      });
    }
  }

  return notifications;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    if (!isVercelCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = await createServiceClient();
  const budapestNow = getBudapestNow();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(
      'id, push_enabled, push_magia_reminders, push_magia_time, push_magia_evening, push_magia_evening_time, push_magia_streak, push_magia_streak_time, push_magia_reengagement, last_magia_push_date, last_magia_evening_push_date, last_magia_streak_push_date, last_magia_reengagement_date, last_magia_activity_date, push_angol_reminders, push_angol_time, preferred_language, last_angol_push_date'
    )
    .eq('push_enabled', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profiles?.length) {
    return NextResponse.json({ sent: 0, checked: 0, budapest: budapestNow });
  }

  let sent = 0;
  let staleRemoved = 0;

  for (const profile of profiles as ProfileRow[]) {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', profile.id);

    if (!subscriptions?.length) continue;

    const notifications = await buildPushNotifications(profile, budapestNow, supabase);
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

    const hasValidSub = subscriptions.some((s) => !staleEndpoints.has(s.endpoint));
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (!hasValidSub) updates.push_enabled = false;
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
    budapest: budapestNow,
  });
}