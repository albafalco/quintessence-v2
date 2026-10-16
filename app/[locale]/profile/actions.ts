'use server';

import { createClient } from '@/lib/supabase/server';
import { generateInviteCode } from '@/lib/admin';

/** Error keys of create_user_invite() (migration 014), mapped to invites.err* texts. */
const KNOWN_ERRORS = ['invalid_email', 'no_balance', 'monthly_limit', 'email_registered', 'email_pending'] as const;
export type InviteErrorKey = (typeof KNOWN_ERRORS)[number] | 'generic';

export type CreateInviteResult =
  | { ok: true; code: string; email: string; expiresAt: string }
  | { ok: false; error: InviteErrorKey };

/**
 * Creates an e-mail-bound invite from the user's own balance. The code is
 * generated here (crypto RNG); every rule is checked by the database function.
 */
export async function createMyInvite(email: string, message: string): Promise<CreateInviteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'generic' };

  // A clash of two random codes is practically impossible, but retry anyway
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase.rpc('create_user_invite', {
      p_code: generateInviteCode(),
      p_email: email,
      p_message: message,
    });
    if (!error) {
      const row = (data as { code: string; email: string; expires_at: string }[] | null)?.[0];
      if (!row) return { ok: false, error: 'generic' };
      return { ok: true, code: row.code, email: row.email, expiresAt: row.expires_at };
    }
    if (error.code === '23505') continue;
    const key = KNOWN_ERRORS.find((k) => error.message === k);
    if (!key) console.error('[invites] create_user_invite failed:', error.message);
    return { ok: false, error: key ?? 'generic' };
  }
  return { ok: false, error: 'generic' };
}
