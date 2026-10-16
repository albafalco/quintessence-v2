import { getAdminState } from '@/lib/admin';
import { isSuspended, type AdminUserRow, type InviteGrantRow } from '@/lib/admin-users';
import { UserManager } from '@/components/admin/UserManager';

export default async function AdminUsersPage() {
  const { state, supabase, user } = await getAdminState();
  if (state !== 'ok' || !user) return null;

  const [usersRes, grantsRes] = await Promise.all([
    supabase.rpc('admin_list_users'),
    supabase.from('invite_grants').select('id, user_id, amount, reason, created_at').order('created_at', { ascending: false }),
  ]);

  if (usersRes.error) {
    console.error('[admin/users] admin_list_users failed:', usersRes.error.message);
    return (
      <p className="premium-card p-5 text-sm text-red-400">
        Nem sikerült betölteni a felhasználókat. Le van futtatva a 012-es migráció?
      </p>
    );
  }

  const grants = (grantsRes.data ?? []) as InviteGrantRow[];
  const users = ((usersRes.data ?? []) as AdminUserRow[]).map((u) => ({
    ...u,
    suspended: isSuspended(u.banned_until),
    grants: grants.filter((g) => g.user_id === u.id),
  }));

  return <UserManager users={users} currentUserId={user.id} />;
}
