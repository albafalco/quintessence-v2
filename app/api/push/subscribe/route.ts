import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const { error } = await supabase.from('push_subscriptions').insert({
    user_id: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase
    .from('profiles')
    .update({ push_enabled: true, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  return NextResponse.json({ success: true });
}