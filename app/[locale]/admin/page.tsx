import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getAdminState } from '@/lib/admin';
import { formatAdminDate, inviteStatus, type InviteStatus } from '@/lib/invite-codes';
import { MfaDevices } from '@/components/admin/MfaDevices';

const ACTION_LABELS: Record<string, string> = {
  'invite.create': 'Meghívókód létrehozva',
  'invite.revoke': 'Meghívókód visszavonva',
  'mfa.enroll': 'Kétlépcsős eszköz hozzáadva',
  'mfa.remove': 'Kétlépcsős eszköz eltávolítva',
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

  const [codesRes, logRes] = await Promise.all([
    supabase.from('invite_codes').select('is_used, expires_at, revoked_at'),
    supabase.from('admin_audit_log').select('id, action, target, created_at').order('created_at', { ascending: false }).limit(10),
  ]);

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
