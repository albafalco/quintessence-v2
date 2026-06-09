import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/push';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!subscriptions?.length) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
  }

  const failures: string[] = [];

  for (const sub of subscriptions) {
    try {
      await sendPushNotification(sub, {
        title: 'Quintessence',
        body: 'A push értesítések működnek!',
        url: '/hu/profile',
      });
    } catch (err) {
      failures.push(err instanceof Error ? err.message : 'Send failed');
    }
  }

  if (failures.length === subscriptions.length) {
    return NextResponse.json({ error: failures[0] ?? 'Send failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, sent: subscriptions.length - failures.length });
}