import { getAdminState } from '@/lib/admin';
import { parsePushResponses, pushHealth, type PushResponse, type PushRun } from '@/lib/admin-push';
import { PushHealthBadge } from '@/components/admin/PushHealthBadge';
import type { AdminUserRow } from '@/lib/admin-users';
import { formatAdminDate } from '@/lib/invite-codes';
import { cn } from '@/lib/utils';

export default async function AdminPushPage() {
  const { state, supabase } = await getAdminState();
  if (state !== 'ok') return null;

  const [runsRes, usersRes] = await Promise.all([supabase.rpc('admin_push_runs', { p_limit: 40 }), supabase.rpc('admin_list_users')]);

  if (runsRes.error) {
    console.error('[admin/push] admin_push_runs failed:', runsRes.error.message);
    return <p className="premium-card p-5 text-sm text-red-400">Nem sikerült betölteni a push-állapotot. Le van futtatva a 012-es migráció?</p>;
  }

  const runs = ((runsRes.data?.runs ?? []) as PushRun[]).slice(0, 10);
  const responses = parsePushResponses((runsRes.data?.responses ?? []) as PushResponse[]);
  const { health, lastOk } = pushHealth(responses);
  const users = (usersRes.data ?? []) as AdminUserRow[];
  const pushUsers = users.filter((u) => u.push_enabled).length;
  const devices = users.reduce((sum, u) => sum + u.push_devices, 0);
  const totals = responses.reduce(
    (acc, r) => ({ sent: acc.sent + (r.sent ?? 0), stale: acc.stale + (r.staleRemoved ?? 0) }),
    { sent: 0, stale: 0 }
  );
  const failedRuns = runs.filter((r) => r.status !== 'succeeded');

  return (
    <div className="space-y-6">
      <section className="premium-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-gradient-gold">Push-ütemező</h2>
          <PushHealthBadge health={health} className="rounded-full bg-muted/40 px-3 py-1" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          5 percenként fut. Utolsó sikeres futás: {lastOk ? formatAdminDate(lastOk) : 'nincs adat'}.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { value: pushUsers, label: 'push bekapcsolva' },
            { value: devices, label: 'feliratkozott eszköz' },
            { value: totals.sent, label: 'elküldve (kb. 6 óra)' },
            { value: totals.stale, label: 'lejárt törölve (6 óra)' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-muted/30 px-3 py-2">
              <p className="text-2xl font-bold tabular-nums text-cream">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        {failedRuns.length > 0 && (
          <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
            Az utolsó 10 ütemezett indításból {failedRuns.length} nem sikerült: {failedRuns[0].return_message ?? failedRuns[0].status}
          </p>
        )}
      </section>

      <section className="premium-card p-5">
        <h2 className="font-display text-lg font-semibold text-gradient-gold">Utolsó futások</h2>
        {responses.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nincs megőrzött válasz (a Supabase kb. 6 óráig őrzi őket).</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[26rem] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  <th className="py-1.5 pr-3 font-medium">Időpont</th>
                  <th className="py-1.5 pr-3 font-medium">Státusz</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Elküldve</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Átnézve</th>
                  <th className="py-1.5 text-right font-medium">Lejárt törölve</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {responses.slice(0, 20).map((r) => (
                  <tr key={r.created}>
                    <td className="py-1.5 pr-3 text-xs text-muted-foreground">{formatAdminDate(r.created)}</td>
                    <td className="py-1.5 pr-3">
                      <span
                        className={cn(
                          'rounded-md px-1.5 py-0.5 text-xs font-semibold',
                          r.status_code === 200 ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'
                        )}
                        title={r.error_msg ?? undefined}
                      >
                        {r.timed_out ? 'időtúllépés' : (r.status_code ?? 'hiba')}
                      </span>
                    </td>
                    <td className={cn('py-1.5 pr-3 text-right tabular-nums', (r.sent ?? 0) > 0 ? 'font-semibold text-accent' : 'text-cream')}>
                      {r.sent ?? '—'}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-cream">{r.checked ?? '—'}</td>
                    <td className="py-1.5 text-right tabular-nums text-cream">{r.staleRemoved ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
