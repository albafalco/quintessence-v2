import 'server-only';
import { randomInt } from 'crypto';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * - none: not signed in or not an admin (pages answer 404)
 * - enroll: admin without a verified two-factor device yet
 * - verify: admin with a device, but this session has not passed the code check
 * - ok: admin with an aal2 session
 */
export type AdminState = 'none' | 'enroll' | 'verify' | 'ok';

export async function getAdminState(): Promise<{ state: AdminState; supabase: SupabaseClient; user: User | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: 'none', supabase, user: null };

  const { data: adminRow } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!adminRow) return { state: 'none', supabase, user };

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === 'aal2') return { state: 'ok', supabase, user };
  return { state: aal?.nextLevel === 'aal2' ? 'verify' : 'enroll', supabase, user };
}

export class AdminAuthError extends Error {
  constructor() {
    super('Admin access required');
  }
}

/**
 * Guard for every admin server action. Besides the session state, the
 * database itself confirms admin + aal2 (is_admin() reads the signed JWT).
 */
export async function requireAdmin(): Promise<{ supabase: SupabaseClient; user: User }> {
  const { state, supabase, user } = await getAdminState();
  if (state !== 'ok' || !user) throw new AdminAuthError();
  const { data: confirmed, error } = await supabase.rpc('is_admin');
  if (error || confirmed !== true) throw new AdminAuthError();
  return { supabase, user };
}

/** Appends an entry to admin_audit_log; a failed log write is reported but does not undo the action. */
export async function logAdminAction(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  target: string | null,
  details?: Record<string, unknown>
) {
  const { error } = await supabase
    .from('admin_audit_log')
    .insert({ admin_id: userId, action, target, details: details ?? null });
  if (error) console.error('[admin] audit log insert failed:', error.message);
}

// No 0/O, 1/I/L — easy to read out or type from a phone
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomBlock(length: number) {
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

/** e.g. "QX-7F3K-9MPA" (~40 bits of randomness) */
export function generateInviteCode() {
  return `QX-${randomBlock(4)}-${randomBlock(4)}`;
}
