import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/push';

interface UnlockPayload {
  unlockedFokozatId: number;
  title: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: UnlockPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { unlockedFokozatId, title } = body;
  if (!unlockedFokozatId || !title) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user.id);

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      await sendPushNotification(sub, {
        title: `⭐ ${unlockedFokozatId}. fokozat feloldva!`,
        body: `Gratulálok! Elérted a(z) "${title}" fokozatot. Folytasd az utad!`,
        url: `/hu/modules/magia/fokozat/${unlockedFokozatId}`,
      });
      sent++;
    } catch {
      // expired subscription — skip
    }
  }

  return NextResponse.json({ sent });
}
