import { getAdminState } from '@/lib/admin';
import { inviteStatus, type InviteCodeRow } from '@/lib/invite-codes';
import { InviteManager } from '@/components/admin/InviteManager';

export default async function AdminInvitesPage() {
  const { state, supabase } = await getAdminState();
  if (state !== 'ok') return null;

  const { data } = await supabase
    .from('invite_codes')
    .select('id, code, is_used, used_by, used_at, created_at, email, note, expires_at, revoked_at')
    .order('created_at', { ascending: false });
  const codes = (data ?? []) as InviteCodeRow[];

  // Who used a code: only the username is shown
  const userIds = [...new Set(codes.map((c) => c.used_by).filter((id): id is string => Boolean(id)))];
  const usernames: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);
    for (const p of profiles ?? []) usernames[p.id] = p.username;
  }

  return <InviteManager codes={codes.map((c) => ({ ...c, status: inviteStatus(c) }))} usernames={usernames} />;
}
