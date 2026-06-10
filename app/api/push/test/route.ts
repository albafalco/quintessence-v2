import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/push';
import { getMessage, resolveLocale } from '@/lib/i18n-messages';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_language')
    .eq('id', user.id)
    .single();

  const locale = resolveLocale(profile?.preferred_language);

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!subscriptions?.length) {
    return NextResponse.json(
      { errorCode: 'NO_SUBSCRIPTION', error: await getMessage(locale, 'push.noSubscription') },
      { status: 404 }
    );
  }

  const title = await getMessage(locale, 'push.testTitle');
  const body = await getMessage(locale, 'push.testBody');
  const failures: string[] = [];

  for (const sub of subscriptions) {
    try {
      await sendPushNotification(sub, {
        title,
        body,
        url: `/${locale}/profile`,
      });
    } catch (err) {
      failures.push(err instanceof Error ? err.message : await getMessage(locale, 'push.sendFailed'));
    }
  }

  if (failures.length === subscriptions.length) {
    return NextResponse.json(
      { errorCode: 'SEND_FAILED', error: failures[0] ?? await getMessage(locale, 'push.sendFailed') },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, sent: subscriptions.length - failures.length });
}