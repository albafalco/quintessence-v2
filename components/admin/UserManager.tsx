'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellOff, Check, Copy, KeyRound, MoreHorizontal, PauseCircle, PlayCircle, Search, Send, Ticket, Trash2 } from 'lucide-react';
import { createRecoveryLink, deleteUserAccount, grantInvites, sendUserPush, setSuspended } from '@/app/[locale]/admin/felhasznalok/actions';
import { PrimaryButton } from '@/components/admin/ui';
import { Collapse } from '@/components/ui/collapse';
import { useConfirm } from '@/components/ui/confirm-dialog';
import type { AdminUser } from '@/lib/admin-users';
import { formatAdminDate } from '@/lib/invite-codes';
import { cn } from '@/lib/utils';

type Sort = 'activity' | 'created' | 'name';
type Panel = 'invites' | 'push' | 'recovery';

const fieldClass =
  'h-10 w-full rounded-xl border border-border/60 bg-background/60 px-3 text-sm text-cream placeholder:text-muted-foreground/50 focus:border-accent/60 focus:outline-none';

/** Latest of sign-in and practice, as a sortable string (ISO dates compare lexically). */
function activityKey(u: AdminUser) {
  const practice = u.last_practice_date ? `${u.last_practice_date}T23:59:59` : '';
  const signIn = u.last_sign_in_at ?? '';
  return practice > signIn ? practice : signIn;
}

export function UserManager({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('activity');

  const q = query.trim().toLowerCase();
  const visible = users
    .filter((u) => !q || [u.name, u.username, u.email].some((v) => v?.toLowerCase().includes(q)))
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'hu');
      if (sort === 'created') return b.created_at.localeCompare(a.created_at);
      return activityKey(b).localeCompare(activityKey(a));
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Keresés: név, felhasználónév, e-mail"
            aria-label="Keresés"
            className={cn(fieldClass, 'pl-9')}
          />
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Rendezés" className={cn(fieldClass, 'w-auto')}>
          <option value="activity">Utolsó aktivitás</option>
          <option value="created">Regisztráció</option>
          <option value="name">Név</option>
        </select>
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        {visible.length} / {users.length} felhasználó
      </p>
      {visible.length === 0 ? (
        <p className="premium-card p-6 text-center text-sm text-muted-foreground">Nincs találat.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((u) => (
            <UserCard key={u.id} user={u} isSelf={u.id === currentUserId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{label}</p>
      <p className="truncate text-xs text-cream">{children}</p>
    </div>
  );
}

function UserCard({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const report = (result: { ok: boolean; error?: string }, okText: string) => {
    setNotice(result.ok ? { ok: true, text: okText } : { ok: false, text: result.error ?? 'Hiba történt.' });
    if (result.ok) router.refresh();
  };

  const openPanel = (p: Panel) => {
    setMenuOpen(false);
    setNotice(null);
    setPanel((cur) => (cur === p ? null : p));
  };

  const toggleSuspend = async () => {
    setMenuOpen(false);
    const suspend = !user.suspended;
    const ok = await confirm({
      message: suspend
        ? `Felfüggeszted @${user.username} fiókját? Nem tud majd belépni; a nyitott munkamenete legfeljebb 1 órán belül lejár. Az adatai megmaradnak.`
        : `Feloldod @${user.username} felfüggesztését?`,
      confirmLabel: suspend ? 'Felfüggesztés' : 'Feloldás',
      cancelLabel: 'Mégse',
      destructive: suspend,
    });
    if (!ok) return;
    report(await setSuspended(user.id, suspend), suspend ? 'Fiók felfüggesztve.' : 'Felfüggesztés feloldva.');
  };

  const remove = async () => {
    setMenuOpen(false);
    const ok = await confirm({
      message: `@${user.username} fiókja és minden adata véglegesen törlődik. Ez nem vonható vissza.`,
      confirmLabel: 'Végleges törlés',
      cancelLabel: 'Mégse',
      destructive: true,
      requireText: user.username,
      requireTextLabel: `Írd be a felhasználónevet a megerősítéshez: ${user.username}`,
    });
    if (!ok) return;
    report(await deleteUserAccount(user.id, user.username), 'Fiók törölve.');
  };

  const menuItems: { icon: typeof Ticket; label: string; onClick: () => void; danger?: boolean; hidden?: boolean }[] = [
    { icon: Ticket, label: 'Meghívók', onClick: () => openPanel('invites') },
    { icon: Send, label: 'Értesítés küldése', onClick: () => openPanel('push') },
    { icon: KeyRound, label: 'Jelszó-visszaállító link', onClick: () => openPanel('recovery') },
    { icon: user.suspended ? PlayCircle : PauseCircle, label: user.suspended ? 'Felfüggesztés feloldása' : 'Felfüggesztés', onClick: () => void toggleSuspend(), hidden: isSelf },
    { icon: Trash2, label: 'Fiók törlése', onClick: () => void remove(), danger: true, hidden: isSelf },
  ];

  return (
    <li className={cn('premium-card p-4', user.suspended && 'border-red-500/20')}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-semibold text-cream">{user.name}</span>
            <span className="text-sm text-muted-foreground">@{user.username}</span>
            {user.is_admin && <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">Admin</span>}
            {user.suspended && <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">Felfüggesztve</span>}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {user.email}
            {user.invited_by_username && <> · Meghívta: @{user.invited_by_username}</>}
          </p>
        </div>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`Műveletek: @${user.username}`}
            aria-expanded={menuOpen}
            className={cn('rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted/40 hover:text-cream', menuOpen && 'bg-muted/40 text-cream')}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-60 animate-pop-in overflow-hidden rounded-xl border border-border/60 bg-card-elevated/95 py-1 shadow-card backdrop-blur motion-reduce:animate-none">
              {menuItems
                .filter((item) => !item.hidden)
                .map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition',
                      item.danger ? 'text-red-300 hover:bg-red-500/10' : 'text-cream hover:bg-muted/40'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
        <Fact label="Regisztráció">{formatAdminDate(user.created_at, false)}</Fact>
        <Fact label="Utolsó belépés">{user.last_sign_in_at ? formatAdminDate(user.last_sign_in_at, false) : '—'}</Fact>
        <Fact label="Utolsó gyakorlás">{user.last_practice_date ? formatAdminDate(`${user.last_practice_date}T12:00:00Z`, false) : '—'}</Fact>
        <Fact label="Push">
          <span className="inline-flex items-center gap-1">
            {user.push_enabled ? <Bell className="h-3 w-3 text-accent" /> : <BellOff className="h-3 w-3 text-muted-foreground" />}
            {user.push_enabled ? 'be' : 'ki'} · {user.push_devices} eszköz
          </span>
        </Fact>
        <Fact label="Meghívó">
          {user.is_admin ? '∞' : user.invite_balance}
          {!user.is_admin && (user.invites_sent ?? 0) > 0 && (
            <span className="text-muted-foreground">
              {' '}
              · {user.invites_accepted ?? 0}/{user.invites_sent} elfogadva
            </span>
          )}
        </Fact>
      </div>

      {notice && (
        <p className={cn('mt-3 animate-fade-up text-xs motion-reduce:animate-none', notice.ok ? 'text-green-400' : 'text-red-400')}>{notice.text}</p>
      )}

      <Collapse open={panel !== null}>
        <div className="mt-3 border-t border-border/30 pt-3">
          {panel === 'invites' && <InvitesPanel user={user} onResult={report} />}
          {panel === 'push' && <PushPanel user={user} onResult={report} />}
          {panel === 'recovery' && <RecoveryPanel user={user} />}
        </div>
      </Collapse>
      {confirmDialog}
    </li>
  );
}

type ResultHandler = (result: { ok: boolean; error?: string }, okText: string) => void;

function InvitesPanel({ user, onResult }: { user: AdminUser; onResult: ResultHandler }) {
  const [mode, setMode] = useState<'add' | 'take'>('add');
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const signed = mode === 'add' ? amount : -amount;
    const result = await grantInvites(user.id, signed, reason);
    setBusy(false);
    if (result.ok) setReason('');
    onResult(result, mode === 'add' ? `+${amount} meghívó hozzáadva.` : `${amount} meghívó elvéve.`);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-cream">
        Egyenleg: <span className="font-semibold text-accent">{user.is_admin ? '∞ (admin)' : user.invite_balance}</span>
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex rounded-xl border border-border/60 p-0.5">
          {(['add', 'take'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition', mode === m ? 'bg-primary/30 text-accent' : 'text-muted-foreground')}
            >
              {m === 'add' ? '+ Hozzáadás' : '− Elvétel'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAmount(n)}
              className={cn(
                'h-9 w-9 rounded-lg border text-sm font-semibold transition',
                amount === n ? 'border-accent/60 bg-accent/10 text-accent' : 'border-border/60 text-muted-foreground'
              )}
            >
              {n}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={20}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            aria-label="Mennyiség"
            className={cn(fieldClass, 'h-9 w-16 text-center')}
          />
        </div>
      </div>
      <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Indoklás (pl. barátainak)" className={fieldClass} />
      <PrimaryButton onClick={() => void submit()} disabled={busy || reason.trim().length < 2}>
        {busy ? 'Mentés…' : mode === 'add' ? `+${amount} meghívó` : `−${amount} meghívó`}
      </PrimaryButton>
      {user.grants.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">Előzmények</p>
          <ul className="space-y-1">
            {user.grants.map((g) => (
              <li key={g.id} className="flex items-baseline gap-2 text-xs">
                <span className={cn('w-8 shrink-0 font-semibold tabular-nums', g.amount > 0 ? 'text-green-400' : 'text-red-300')}>
                  {g.amount > 0 ? `+${g.amount}` : g.amount}
                </span>
                <span className="min-w-0 flex-1 truncate text-cream">{g.reason}</span>
                <span className="shrink-0 text-muted-foreground">{formatAdminDate(g.created_at, false)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PushPanel({ user, onResult }: { user: AdminUser; onResult: ResultHandler }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (user.push_devices === 0) {
    return <p className="text-sm text-muted-foreground">Ennek a felhasználónak nincs push-feliratkozott eszköze.</p>;
  }

  const send = async () => {
    setBusy(true);
    const result = await sendUserPush(user.id, message);
    setBusy(false);
    if (result.ok) setMessage('');
    onResult(result, result.ok ? `Elküldve (${result.data?.sent}/${result.data?.devices} eszköz).` : '');
  };

  return (
    <div className="space-y-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={200}
        rows={2}
        placeholder="Saját üzenet (üresen hagyva: „A push értesítések működnek!”)"
        className={cn(fieldClass, 'h-auto resize-none py-2')}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-muted-foreground">{message.length}/200</span>
        <PrimaryButton onClick={() => void send()} disabled={busy}>
          {busy ? 'Küldés…' : 'Értesítés küldése'}
        </PrimaryButton>
      </div>
    </div>
  );
}

function RecoveryPanel({ user }: { user: AdminUser }) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setBusy(true);
    setError(null);
    const result = await createRecoveryLink(user.id);
    setBusy(false);
    if (result.ok) setLink(result.data?.link ?? null);
    else setError(result.error);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Egyszer használható link, kb. 1 óráig érvényes. Küldd el @{user.username} részére (pl. üzenetben); a linken új jelszót állíthat be.
      </p>
      {!link ? (
        <PrimaryButton onClick={() => void generate()} disabled={busy}>
          {busy ? 'Létrehozás…' : 'Link létrehozása'}
        </PrimaryButton>
      ) : (
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-muted/40 px-2 py-1.5 font-mono text-xs text-cream">{link}</code>
          <button
            type="button"
            onClick={() =>
              void navigator.clipboard.writeText(link).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
            }
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/30 px-2.5 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Másolva' : 'Másolás'}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
