export interface InviteCodeRow {
  id: string;
  code: string;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  email: string | null;
  note: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

export type InviteStatus = 'available' | 'used' | 'expired' | 'revoked';

export function inviteStatus(row: Pick<InviteCodeRow, 'is_used' | 'expires_at' | 'revoked_at'>, now = Date.now()): InviteStatus {
  if (row.is_used) return 'used';
  if (row.revoked_at) return 'revoked';
  if (row.expires_at && new Date(row.expires_at).getTime() <= now) return 'expired';
  return 'available';
}

/** Registration link that pre-fills the code (Hungarian UI). */
export function inviteLink(origin: string, code: string) {
  return `${origin}/hu/auth/register?code=${encodeURIComponent(code)}`;
}

export function formatAdminDate(iso: string, withTime = true) {
  return new Intl.DateTimeFormat('hu-HU', {
    timeZone: 'Europe/Budapest',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(iso));
}
