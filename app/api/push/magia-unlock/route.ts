import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/push';
import { getMessage, resolveLocale } from '@/lib/i18n-messages';

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_language')
    .eq('id', user.id)
    .single();

  const locale = resolveLocale(profile?.preferred_language);

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user.id);

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0 });
  }

  const pushTitle = await getMessage(locale, 'push.unlockTitle', { id: unlockedFokozatId });
  const pushBody = await getMessage(locale, 'push.unlockBody', { title });

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      await sendPushNotification(sub, {
        title: pushTitle,
        body: pushBody,
        url: `/${locale}/modules/magia/fokozat/${unlockedFokozatId}`,
      });
      sent++;
    } catch {
      // expired subscription — skip
    }
  }

  return NextResponse.json({ sent });
}