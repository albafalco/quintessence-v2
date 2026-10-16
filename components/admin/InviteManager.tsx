'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Link2 } from 'lucide-react';
import { createInviteCode, revokeInviteCode } from '@/app/[locale]/admin/actions';
import { PrimaryButton } from '@/components/admin/ui';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatAdminDate, inviteLink, type InviteCodeRow, type InviteStatus } from '@/lib/invite-codes';
import { cn } from '@/lib/utils';

type Expiry = 'none' | '7' | '30' | 'date';
type Tab = 'available' | 'used' | 'closed';

const TABS: { id: Tab; label: string; statuses: InviteStatus[] }[] = [
  { id: 'available', label: 'Szabad', statuses: ['available'] },
  { id: 'used', label: 'Felhasznált', statuses: ['used'] },
  { id: 'closed', label: 'Lejárt / visszavont', statuses: ['expired', 'revoked'] },
];

const fieldClass =
  'h-10 w-full rounded-xl border border-border/60 bg-background/60 px-3 text-sm text-cream placeholder:text-muted-foreground/50 focus:border-accent/60 focus:outline-none';

/** text: a string, or a function evaluated on click (e.g. needs window.location). */
function CopyButton({ text, label, icon: Icon }: { text: string | (() => string); label: string; icon: typeof Copy }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(typeof text === 'function' ? text() : text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 px-2.5 py-1 text-xs font-medium text-accent transition hover:bg-accent/10"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
      {copied ? 'Másolva' : label}
    </button>
  );
}

type InviteWithStatus = InviteCodeRow & { status: InviteStatus };

export function InviteManager({ codes, usernames }: { codes: InviteWithStatus[]; usernames: Record<string, string> }) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [note, setNote] = useState('');
  const [email, setEmail] = useState('');
  const [expiry, setExpiry] = useState<Expiry>('30');
  const [expiryDate, setExpiryDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('available');

  const create = async () => {
    let expiresAt: string | null = null;
    if (expiry === '7' || expiry === '30') expiresAt = new Date(Date.now() + Number(expiry) * 86_400_000).toISOString();
    if (expiry === 'date') {
      if (!expiryDate) {
        setError('Válassz lejárati dátumot.');
        return;
      }
      expiresAt = new Date(`${expiryDate}T23:59:59`).toISOString();
    }
    setBusy(true);
    setError(null);
    const result = await createInviteCode({ note, email, expiresAt });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCreated(result.data?.code ?? null);
    setNote('');
    setEmail('');
    setTab('available');
    router.refresh();
  };

  const revoke = async (row: InviteCodeRow) => {
    const ok = await confirm({
      message: `Visszavonod a(z) ${row.code} kódot? Utána nem lehet vele regisztrálni.`,
      confirmLabel: 'Visszavonás',
      cancelLabel: 'Mégse',
      destructive: true,
    });
    if (!ok) return;
    const result = await revokeInviteCode(row.id);
    if (!result.ok) setError(result.error);
    router.refresh();
  };

  const visible = codes.filter((c) => TABS.find((t) => t.id === tab)!.statuses.includes(c.status));

  return (
    <div className="space-y-6">
      <section className="premium-card space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold text-gradient-gold">Új meghívókód</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Megjegyzés (kinek szól)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="pl. Anna" className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">E-mail-cím (nem kötelező)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="anna@example.com"
              className={fieldClass}
            />
          </label>
        </div>
        <p className="-mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Ha megadsz e-mail-címet, a kóddal csak ezzel a címmel lehet regisztrálni.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Lejárat</span>
            <select value={expiry} onChange={(e) => setExpiry(e.target.value as Expiry)} className={cn(fieldClass, 'w-40')}>
              <option value="none">Nincs</option>
              <option value="7">7 nap</option>
              <option value="30">30 nap</option>
              <option value="date">Dátum…</option>
            </select>
          </label>
          {expiry === 'date' && (
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              aria-label="Lejárati dátum"
              className={cn(fieldClass, 'w-44')}
            />
          )}
          <PrimaryButton onClick={() => void create()} disabled={busy} className="ml-auto">
            {busy ? 'Létrehozás…' : 'Kód létrehozása'}
          </PrimaryButton>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {created && (
          <div className="animate-pop-in rounded-xl border border-accent/30 bg-accent/5 p-4 motion-reduce:animate-none">
            <p className="text-xs text-muted-foreground">Az új kód:</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-accent">{created}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton text={created} label="Kód másolása" icon={Copy} />
              <CopyButton text={() => inviteLink(window.location.origin, created)} label="Link másolása" icon={Link2} />
            </div>
          </div>
        )}
      </section>

      <section className="premium-card p-5">
        <div className="flex gap-1 rounded-2xl border border-border/40 bg-background/60 p-1" role="tablist">
          {TABS.map((t) => {
            const count = codes.filter((c) => t.statuses.includes(c.status)).length;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'min-w-0 flex-1 truncate rounded-xl px-2 py-1.5 text-xs font-medium transition-all sm:text-sm',
                  tab === t.id ? 'bg-primary/30 text-accent' : 'text-muted-foreground hover:bg-muted/40 hover:text-cream'
                )}
              >
                {t.label} <span className="tabular-nums opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nincs itt kód.</p>
        ) : (
          <ul key={tab} className="mt-3 animate-fade-up divide-y divide-border/30 motion-reduce:animate-none">
            {visible.map((c) => (
              <li key={c.id} className="space-y-1.5 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={cn('font-mono text-sm font-semibold tracking-wider', c.status === 'available' ? 'text-accent' : 'text-muted-foreground')}>
                    {c.code}
                  </span>
                  {c.status === 'expired' && <span className="rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">lejárt</span>}
                  {c.status === 'revoked' && <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-300/80">visszavonva</span>}
                  {c.note && <span className="text-sm text-cream">{c.note}</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.email && <>✉ {c.email} · </>}
                  Létrehozva: {formatAdminDate(c.created_at, false)}
                  {c.created_by && usernames[c.created_by] && <> · Készítette: @{usernames[c.created_by]}</>}
                  {c.status === 'available' && <> · Lejár: {c.expires_at ? formatAdminDate(c.expires_at, false) : 'soha'}</>}
                  {c.status === 'used' && (
                    <>
                      {' '}
                      · Felhasználta: <span className="text-cream">{c.used_by && usernames[c.used_by] ? `@${usernames[c.used_by]}` : 'törölt fiók'}</span>
                      {c.used_at && <> ({formatAdminDate(c.used_at)})</>}
                    </>
                  )}
                </p>
                {c.message && <p className="text-xs italic text-muted-foreground">„{c.message}”</p>}
                {c.status === 'available' && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <CopyButton text={c.code} label="Kód" icon={Copy} />
                    <CopyButton text={() => inviteLink(window.location.origin, c.code)} label="Link" icon={Link2} />
                    <button
                      type="button"
                      onClick={() => void revoke(c)}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-300/80 transition hover:bg-red-500/10"
                    >
                      Visszavonás
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      {confirmDialog}
    </div>
  );
}
