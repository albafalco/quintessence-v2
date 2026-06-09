import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/push';
import {
  DEFAULT_ANGOL_PUSH_TIME,
  DEFAULT_MAGIA_PUSH_TIME,
} from '@/lib/locale-meta';
import {
  getBudapestNow,
  hasAngolActivityToday,
  isReminderDue,
} from '@/lib/push-reminders';

interface ProfileRow {
  id: string;
  push_enabled: boolean;
  push_magia_reminders: boolean;
  push_angol_reminders: boolean;
  push_magia_time: string | null;
  push_angol_time: string | null;
  preferred_language: string;
  last_angol_push_date: string | null;
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
      'id, push_enabled, push_magia_reminders, push_angol_reminders, push_magia_time, push_angol_time, preferred_language, last_angol_push_date'
    )
    .eq('push_enabled', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profiles?.length) {
    return NextResponse.json({ sent: 0, checked: 0, budapest: budapestNow });
  }

  let sent = 0;

  for (const profile of profiles as ProfileRow[]) {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', profile.id);

    if (!subscriptions?.length) continue;

    const notifications: { title: string; body: string; url: string; type: 'magia' | 'angol' }[] =
      [];

    const magiaTime = profile.push_magia_time || DEFAULT_MAGIA_PUSH_TIME;
    if (
      profile.push_magia_reminders &&
      isReminderDue(budapestNow.totalMinutes, magiaTime)
    ) {
      notifications.push({
        type: 'magia',
        title: 'Mágia emlékeztető',
        body: 'Ne felejtsd el a mai gyakorlatokat!',
        url: '/hu/modules/magia',
      });
    }

    const angolTime = profile.push_angol_time || DEFAULT_ANGOL_PUSH_TIME;
    const angolDue =
      profile.push_angol_reminders &&
      profile.preferred_language === 'hu' &&
      isReminderDue(budapestNow.totalMinutes, angolTime);
    const alreadySentAngolToday = profile.last_angol_push_date === budapestNow.date;

    if (angolDue && !alreadySentAngolToday) {
      const completedToday = await hasAngolActivityToday(
        supabase,
        profile.id,
        budapestNow.date
      );

      if (!completedToday) {
        notifications.push({
          type: 'angol',
          title: 'Angol emlékeztető',
          body: 'Még nem gyakoroltál ma angolul. Ideje egy kis gyakorlás!',
          url: '/hu/modules/angol',
        });
      }
    }

    if (!notifications.length) continue;

    let angolSent = false;

    for (const sub of subscriptions) {
      for (const notif of notifications) {
        try {
          await sendPushNotification(sub, notif);
          sent++;
          if (notif.type === 'angol') angolSent = true;
        } catch {
          // expired subscription
        }
      }
    }

    if (angolSent) {
      await supabase
        .from('profiles')
        .update({
          last_angol_push_date: budapestNow.date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
    }
  }

  return NextResponse.json({
    sent,
    checked: profiles.length,
    budapest: budapestNow,
  });
}