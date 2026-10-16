'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { AdminAuthError, logAdminAction, requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/push';
import { getMessage, resolveLocale } from '@/lib/i18n-messages';
import type { ActionResult } from '@/app/[locale]/admin/actions';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_GRANT = 20;
const MAX_PUSH_MESSAGE = 200;
/** ~100 years: Supabase has no "forever" ban */
const SUSPEND_DURATION = '876000h';

function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof AdminAuthError) return { ok: false, error: 'Nincs jogosultságod, vagy lejárt az admin munkamenet. Töltsd újra az oldalt.' };
  console.error('[admin/users] action failed:', err);
  return { ok: false, error: 'Váratlan hiba történt.' };
}

function refresh() {
  revalidatePath('/[locale]/admin', 'layout');
}

async function loadTarget(supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'], userId: string) {
  if (!UUID_RE.test(userId)) return null;
  const { data } = await supabase.from('profiles').select('id, username, preferred_language').eq('id', userId).maybeSingle();
  return data as { id: string; username: string; preferred_language: string | null } | null;
}

/** Adds (positive) or takes away (negative) invites; the balance can't go below zero. */
export async function grantInvites(userId: string, amount: number, reason: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin();
    const target = await loadTarget(supabase, userId);
    if (!target) return { ok: false, error: 'Ismeretlen felhasználó.' };
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > MAX_GRANT) {
      return { ok: false, error: `A mennyiség 1 és ${MAX_GRANT} közötti egész szám lehet (elvételnél negatív).` };
    }
    const trimmedReason = reason.trim().slice(0, 200);
    if (trimmedReason.length < 2) return { ok: false, error: 'Írj rövid indoklást.' };

    if (amount < 0) {
      const { data: balance, error } = await supabase.rpc('invite_balance', { p_user_id: userId });
      if (error) throw new Error(error.message);
      if ((balance ?? 0) + amount < 0) return { ok: false, error: `Csak ${balance ?? 0} meghívó vehető el.` };
    }

    const { error } = await supabase
      .from('invite_grants')
      .insert({ user_id: userId, amount, reason: trimmedReason, granted_by: user.id });
    if (error) throw new Error(error.message);
    await logAdminAction(supabase, user.id, amount > 0 ? 'invites.grant' : 'invites.revoke', `@${target.username}`, {
      amount,
      reason: trimmedReason,
    });
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

/**
 * One-time password reset link (valid ~1 hour) for the admin to send by hand:
 * Supabase's built-in mailer only delivers to project team members.
 */
export async function createRecoveryLink(userId: string): Promise<ActionResult<{ link: string }>> {
  try {
    const { supabase, user } = await requireAdmin();
    const target = await loadTarget(supabase, userId);
    if (!target) return { ok: false, error: 'Ismeretlen felhasználó.' };

    const service = await createServiceClient();
    const { data: authUser, error: getError } = await service.auth.admin.getUserById(userId);
    if (getError || !authUser.user?.email) throw new Error(getError?.message ?? 'missing email');

    const { data, error } = await service.auth.admin.generateLink({ type: 'recovery', email: authUser.user.email });
    if (error || !data.properties?.hashed_token) throw new Error(error?.message ?? 'missing token');

    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'https';
    const locale = resolveLocale(target.preferred_language);
    const link = `${proto}://${host}/${locale}/auth/uj-jelszo?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery`;

    await logAdminAction(supabase, user.id, 'user.recovery_link', `@${target.username}`);
    return { ok: true, data: { link } };
  } catch (err) {
    return failure(err);
  }
}

export async function setSuspended(userId: string, suspended: boolean): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin();
    if (userId === user.id) return { ok: false, error: 'A saját fiókodat nem függesztheted fel.' };
    const target = await loadTarget(supabase, userId);
    if (!target) return { ok: false, error: 'Ismeretlen felhasználó.' };

    const service = await createServiceClient();
    const { error } = await service.auth.admin.updateUserById(userId, { ban_duration: suspended ? SUSPEND_DURATION : 'none' });
    if (error) throw new Error(error.message);
    await logAdminAction(supabase, user.id, suspended ? 'user.suspend' : 'user.unsuspend', `@${target.username}`);
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

/** Push to all of the user's devices; the admin's own text, or the standard test message. */
export async function sendUserPush(userId: string, message: string): Promise<ActionResult<{ sent: number; devices: number }>> {
  try {
    const { supabase, user } = await requireAdmin();
    const target = await loadTarget(supabase, userId);
    if (!target) return { ok: false, error: 'Ismeretlen felhasználó.' };

    const service = await createServiceClient();
    const { data: subs, error } = await service
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    if (!subs?.length) return { ok: false, error: 'Ennek a felhasználónak nincs push-feliratkozott eszköze.' };

    const locale = resolveLocale(target.preferred_language);
    const text = message.trim().slice(0, MAX_PUSH_MESSAGE);
    const payload = {
      title: await getMessage(locale, 'push.testTitle'),
      body: text || (await getMessage(locale, 'push.testBody')),
      url: `/${locale}`,
    };

    let sent = 0;
    const stale: string[] = [];
    for (const sub of subs) {
      try {
        await sendPushNotification(sub, payload);
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) stale.push(sub.endpoint);
        console.error('[admin/push] send failed', { statusCode, endpoint: sub.endpoint.slice(0, 60) });
      }
    }
    if (stale.length) await service.from('push_subscriptions').delete().eq('user_id', userId).in('endpoint', stale);

    await logAdminAction(supabase, user.id, 'user.push', `@${target.username}`, { message: text || null, sent, devices: subs.length });
    refresh();
    if (sent === 0) return { ok: false, error: 'Egyik eszközre sem sikerült elküldeni (a lejárt feliratkozásokat töröltem).' };
    return { ok: true, data: { sent, devices: subs.length } };
  } catch (err) {
    return failure(err);
  }
}

/** Permanently deletes the account; the admin must type the username to confirm. */
export async function deleteUserAccount(userId: string, confirmUsername: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin();
    if (userId === user.id) return { ok: false, error: 'A saját fiókodat itt nem törölheted.' };
    const target = await loadTarget(supabase, userId);
    if (!target) return { ok: false, error: 'Ismeretlen felhasználó.' };
    if (confirmUsername.trim() !== target.username) return { ok: false, error: 'A megerősítő felhasználónév nem egyezik.' };

    const service = await createServiceClient();
    const { error } = await service.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    await logAdminAction(supabase, user.id, 'user.delete', `@${target.username}`);
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}
