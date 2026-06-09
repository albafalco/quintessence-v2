import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/push';

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

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, push_enabled, push_magia_reminders, push_angol_reminders, preferred_language')
    .eq('push_enabled', true);

  if (!profiles?.length) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;

  for (const profile of profiles) {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', profile.id);

    if (!subscriptions?.length) continue;

    const notifications: { title: string; body: string; url: string }[] = [];

    if (profile.push_magia_reminders) {
      notifications.push({
        title: 'Mágia emlékeztető',
        body: 'Ne felejtsd el a mai gyakorlatokat!',
        url: '/hu/modules/magia',
      });
    }

    if (profile.push_angol_reminders && profile.preferred_language === 'hu') {
      notifications.push({
        title: 'Angol emlékeztető',
        body: 'Ideje gyakorolni az angolt!',
        url: '/hu/modules/angol',
      });
    }

    for (const sub of subscriptions) {
      for (const notif of notifications) {
        try {
          await sendPushNotification(sub, notif);
          sent++;
        } catch {
          // expired subscription
        }
      }
    }
  }

  return NextResponse.json({ sent });
}