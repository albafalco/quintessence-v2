import type { SupabaseClient } from '@supabase/supabase-js';
import { subscriptionToPayload } from '@/lib/push-client';

export async function persistPushSubscription(
  supabase: SupabaseClient,
  userId: string,
  subscription: PushSubscription
) {
  const { endpoint, p256dh, auth } = subscriptionToPayload(subscription);

  // Replace only this device's row so the user's other devices keep receiving pushes.
  const { error: deleteError } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

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

/** Remove only the current browser's subscription (e.g. on logout). */
export async function removeCurrentDeviceSubscription(supabase: SupabaseClient, userId: string) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe();
}

export async function clearPushSubscription(supabase: SupabaseClient, userId: string) {
  await supabase.from('push_subscriptions').delete().eq('user_id', userId);
  await supabase
    .from('profiles')
    .update({ push_enabled: false, updated_at: new Date().toISOString() })
    .eq('id', userId);
}