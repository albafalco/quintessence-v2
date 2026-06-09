import type { SupabaseClient } from '@supabase/supabase-js';
import { subscriptionToPayload } from '@/lib/push-client';

export async function persistPushSubscription(
  supabase: SupabaseClient,
  userId: string,
  subscription: PushSubscription
) {
  const { endpoint, p256dh, auth } = subscriptionToPayload(subscription);

  const { error: deleteError } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    throw new Error(`Subscribe failed: ${deleteError.message}`);
  }

  const { error: insertError } = await supabase.from('push_subscriptions').insert({
    user_id: userId,
    endpoint,
    p256dh,
    auth,
  });

  if (insertError) {
    throw new Error(`Subscribe failed: ${insertError.message}`);
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ push_enabled: true, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (profileError) {
    throw new Error(`Subscribe failed: ${profileError.message}`);
  }
}

export async function clearPushSubscription(supabase: SupabaseClient, userId: string) {
  await supabase.from('push_subscriptions').delete().eq('user_id', userId);
  await supabase
    .from('profiles')
    .update({ push_enabled: false, updated_at: new Date().toISOString() })
    .eq('id', userId);
}