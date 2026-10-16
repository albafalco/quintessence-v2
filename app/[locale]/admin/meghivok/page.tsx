import { getAdminState } from '@/lib/admin';
import { inviteStatus, type InviteCodeRow } from '@/lib/invite-codes';
import { InviteManager } from '@/components/admin/InviteManager';

export default async function AdminInvitesPage() {
  const { state, supabase } = await getAdminState();
  if (state !== 'ok') return null;

  const { data } = await supabase
    .from('invite_codes')
    .select('*')
    .order('created_at', { ascending: false });
  const codes = (data ?? []) as InviteCodeRow[];

  // Who used / created a code: only the username is shown
  const userIds = [...new Set(codes.flatMap((c) => [c.used_by, c.created_by]).filter((id): id is string => Boolean(id)))];
  const usernames: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);
    for (const p of profiles ?? []) usernames[p.id] = p.username;
  }

  return <InviteManager codes={codes.map((c) => ({ ...c, status: inviteStatus(c) }))} usernames={usernames} />;
}
