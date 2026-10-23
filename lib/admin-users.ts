export interface AdminUserRow {
  id: string;
  name: string;
  username: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  last_practice_date: string | null;
  push_enabled: boolean;
  push_devices: number;
  invite_balance: number;
  is_admin: boolean;
  /** Migration 014 */
  invited_by_username?: string | null;
  invites_sent?: number;
  invites_accepted?: number;
  /** Migration 018 */
  first_name?: string | null;
  last_name?: string | null;
  name_changed_at?: string | null;
  pending_first_name?: string | null;
  pending_last_name?: string | null;
  pending_requested_at?: string | null;
}

export interface InviteGrantRow {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  created_at: string;
}

export type AdminUser = AdminUserRow & { suspended: boolean; grants: InviteGrantRow[] };

export function isSuspended(bannedUntil: string | null, now = Date.now()) {
  return Boolean(bannedUntil && new Date(bannedUntil).getTime() > now);
}

/** Active within the last `days` days (sign-in or practice). */
export function isRecentlyActive(user: Pick<AdminUserRow, 'last_sign_in_at' | 'last_practice_date'>, days = 7, now = Date.now()) {
  const since = now - days * 86_400_000;
  const signIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
  const practice = user.last_practice_date ? new Date(`${user.last_practice_date}T23:59:59`).getTime() : 0;
  return Math.max(signIn, practice) >= since;
}
