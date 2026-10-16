'use server';

import { revalidatePath } from 'next/cache';
import { AdminAuthError, generateInviteCode, logAdminAction, requireAdmin } from '@/lib/admin';

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const MAX_NOTE_LENGTH = 200;
const MAX_EXPIRY_DAYS = 366;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof AdminAuthError) return { ok: false, error: 'Nincs jogosultságod, vagy lejárt az admin munkamenet. Töltsd újra az oldalt.' };
  console.error('[admin] action failed:', err);
  return { ok: false, error: 'Váratlan hiba történt.' };
}

export async function createInviteCode(input: {
  note: string;
  email: string;
  /** ISO timestamp, or null for no expiry */
  expiresAt: string | null;
}): Promise<ActionResult<{ code: string }>> {
  try {
    const { supabase, user } = await requireAdmin();

    const note = input.note.trim().slice(0, MAX_NOTE_LENGTH) || null;
    const email = input.email.trim().toLowerCase() || null;
    if (email && !EMAIL_RE.test(email)) return { ok: false, error: 'Érvénytelen e-mail-cím.' };

    let expiresAt: string | null = null;
    if (input.expiresAt) {
      const date = new Date(input.expiresAt);
      const now = Date.now();
      if (Number.isNaN(date.getTime()) || date.getTime() <= now) return { ok: false, error: 'A lejárat csak jövőbeli időpont lehet.' };
      if (date.getTime() > now + MAX_EXPIRY_DAYS * 86_400_000) return { ok: false, error: 'A lejárat legfeljebb egy év lehet.' };
      expiresAt = date.toISOString();
    }

    if (email) {
      const { data: pending } = await supabase
        .from('invite_codes')
        .select('id, expires_at')
        .eq('email', email)
        .eq('is_used', false)
        .is('revoked_at', null);
      const active = (pending ?? []).some((p) => !p.expires_at || new Date(p.expires_at).getTime() > Date.now());
      if (active) return { ok: false, error: 'Erre az e-mail-címre már van érvényes, fel nem használt meghívó.' };
    }

    // A clash of two random codes is practically impossible, but retry anyway
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = generateInviteCode();
      const { error } = await supabase
        .from('invite_codes')
        .insert({ code, email, note, expires_at: expiresAt, created_by: user.id });
      if (!error) {
        await logAdminAction(supabase, user.id, 'invite.create', code, { email, note, expires_at: expiresAt });
        revalidatePath('/[locale]/admin', 'layout');
        return { ok: true, data: { code } };
      }
      if (error.code !== '23505') throw new Error(error.message);
    }
    return { ok: false, error: 'Nem sikerült egyedi kódot generálni, próbáld újra.' };
  } catch (err) {
    return failure(err);
  }
}

export async function revokeInviteCode(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin();
    const { data, error } = await supabase
      .from('invite_codes')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('is_used', false)
      .is('revoked_at', null)
      .select('code')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { ok: false, error: 'A kód már fel lett használva vagy vissza lett vonva.' };
    await logAdminAction(supabase, user.id, 'invite.revoke', data.code);
    revalidatePath('/[locale]/admin', 'layout');
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

/**
 * Two-factor devices are managed in the browser (Supabase MFA API); this only
 * records the change. Runs after verification, so the session is aal2 by then.
 */
export async function logMfaChange(kind: 'enroll' | 'remove', deviceName: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin();
    await logAdminAction(supabase, user.id, `mfa.${kind}`, deviceName.slice(0, 100));
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}
