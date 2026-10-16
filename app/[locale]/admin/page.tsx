import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getAdminState } from '@/lib/admin';
import { parsePushResponses, pushHealth, type PushResponse } from '@/lib/admin-push';
import { isRecentlyActive, isSuspended, type AdminUserRow } from '@/lib/admin-users';
import { formatAdminDate, inviteStatus, type InviteStatus } from '@/lib/invite-codes';
import { MfaDevices } from '@/components/admin/MfaDevices';
import { PushHealthBadge } from '@/components/admin/PushHealthBadge';

const ACTION_LABELS: Record<string, string> = {
  'invite.create': 'Meghívókód létrehozva',
  'invite.revoke': 'Meghívókód visszavonva',
  'mfa.enroll': 'Kétlépcsős eszköz hozzáadva',
  'mfa.remove': 'Kétlépcsős eszköz eltávolítva',
  'invites.grant': 'Meghívó adva',
  'invites.revoke': 'Meghívó elvéve',
  'user.recovery_link': 'Jelszó-visszaállító link',
  'user.suspend': 'Fiók felfüggesztve',
  'user.unsuspend': 'Felfüggesztés feloldva',
  'user.push': 'Értesítés küldve',
  'user.delete': 'Fiók törölve',
};

const STATUS_LABELS: Record<InviteStatus, string> = {
  available: 'Szabad',
  used: 'Felhasznált',
  expired: 'Lejárt',
  revoked: 'Visszavont',
};

export default async function AdminOverviewPage() {
  const { state, supabase } = await getAdminState();
  if (state !== 'ok') return null;

  const [codesRes, logRes, usersRes, pushRes] = await Promise.all([
    supabase.from('invite_codes').select('is_used, expires_at, revoked_at'),
    supabase.from('admin_audit_log').select('id, action, target, created_at').order('created_at', { ascending: false }).limit(10),
    supabase.rpc('admin_list_users'),
    supabase.rpc('admin_push_runs', { p_limit: 10 }),
  ]);

  // Both RPCs need migration 012; the overview still works without it
  const users = (usersRes.data ?? []) as AdminUserRow[];
  const userStats = [
    { value: users.length, label: 'Összes' },
    { value: users.filter((u) => isRecentlyActive(u)).length, label: 'Aktív (7 nap)' },
    { value: users.filter((u) => isSuspended(u.banned_until)).length, label: 'Felfüggesztett' },
  ];
  const push = pushRes.error ? null : pushHealth(parsePushResponses((pushRes.data?.responses ?? []) as PushResponse[]));

  const counts: Record<InviteStatus, number> = { available: 0, used: 0, expired: 0, revoked: 0 };
  for (const row of codesRes.data ?? []) counts[inviteStatus(row)]++;

  return (
    <div className="space-y-6">
      <Link href="/hu/admin/meghivok" className="premium-card group block p-5 transition hover:border-accent/30">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-gradient-gold">Meghívókódok</h2>
          <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:text-accent" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(STATUS_LABELS) as InviteStatus[]).map((s) => (
            <div key={s} className="rounded-xl bg-muted/30 px-3 py-2">
              <p className="text-2xl font-bold tabular-nums text-cream">{counts[s]}</p>
              <p className="text-xs text-muted-foreground">{STATUS_LABELS[s]}</p>
            </div>
          ))}
        </div>
      </Link>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link href="/hu/admin/felhasznalok" className="premium-card group block p-5 transition hover:border-accent/30">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-gradient-gold">Felhasználók</h2>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:text-accent" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {userStats.map((s) => (
              <div key={s.label} className="rounded-xl bg-muted/30 px-3 py-2">
                <p className="text-2xl font-bold tabular-nums text-cream">{usersRes.error ? '—' : s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </Link>
        <Link href="/hu/admin/push" className="premium-card group block p-5 transition hover:border-accent/30">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-gradient-gold">Push</h2>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:text-accent" />
          </div>
          {push ? (
            <>
              <PushHealthBadge health={push.health} className="mt-3" />
              <p className="mt-1 text-xs text-muted-foreground">Utolsó sikeres futás: {push.lastOk ? formatAdminDate(push.lastOk) : 'nincs adat'}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Nem elérhető (012-es migráció?)</p>
          )}
        </Link>
      </div>

      <MfaDevices />

      <section className="premium-card p-5">
        <h2 className="font-display text-lg font-semibold text-gradient-gold">Legutóbbi admin műveletek</h2>
        {(logRes.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Még nincs bejegyzés.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/30">
            {(logRes.data ?? []).map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-sm">
                <span className="text-cream">
                  {ACTION_LABELS[entry.action] ?? entry.action}
                  {entry.target && <span className="ml-1.5 font-mono text-xs text-accent/80">{entry.target}</span>}
                </span>
                <span className="text-xs text-muted-foreground">{formatAdminDate(entry.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
