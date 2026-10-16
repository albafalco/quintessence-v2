'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Copy, Share2, Ticket } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createMyInvite } from '@/app/[locale]/profile/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapse } from '@/components/ui/collapse';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { AppIcon } from '@/components/ui/AppIcon';

interface InviteStatus {
  balance: number;
  month_used: number;
  month_limit: number;
}

interface MyInvite {
  id: string;
  /** Only while the invite is still valid */
  code: string | null;
  email: string;
  message: string | null;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  is_used: boolean;
  used_at: string | null;
  used_username: string | null;
}

type InviteState = 'pending' | 'accepted' | 'expired' | 'revoked';

function stateOf(invite: MyInvite): InviteState {
  if (invite.is_used) return 'accepted';
  if (invite.revoked_at) return 'revoked';
  return invite.code ? 'pending' : 'expired';
}

async function loadInvites() {
  const supabase = createClient();
  const [status, list] = await Promise.all([supabase.rpc('my_invite_status'), supabase.rpc('my_invites')]);
  if (status.error || list.error) return null;
  return {
    status: (status.data as InviteStatus[] | null)?.[0] ?? { balance: 0, month_used: 0, month_limit: 3 },
    invites: (list.data ?? []) as MyInvite[],
  };
}

const fieldClass =
  'w-full rounded-xl border border-border/60 bg-background/60 px-3 text-sm text-cream placeholder:text-muted-foreground/50 focus:border-accent/60 focus:outline-none';

/** Share sheet on phones, clipboard everywhere; shows "copied" for a moment. */
function ShareButtons({ link, shareText }: { link: string; shareText: string }) {
  const t = useTranslations('invites');
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function'));
    return () => cancelAnimationFrame(id);
  }, []);

  const copy = () =>
    void navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });

  return (
    <div className="flex flex-wrap gap-2">
      {canShare && (
        <button
          type="button"
          onClick={() => void navigator.share({ title: 'Quintessence', text: shareText, url: link }).catch(() => {})}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-dark via-accent to-accent-light px-3 py-1.5 text-xs font-semibold text-accent-foreground"
        >
          <Share2 className="h-3.5 w-3.5" />
          {t('share')}
        </button>
      )}
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-xl border border-accent/30 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? t('copied') : t('copyLink')}
      </button>
    </div>
  );
}

export function InvitesCard() {
  const t = useTranslations('invites');
  const locale = useLocale();
  const { confirm, confirmDialog } = useConfirm();
  const [data, setData] = useState<Awaited<ReturnType<typeof loadInvites>>>(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ code: string; email: string } | null>(null);
  const [origin, setOrigin] = useState('');

  const reload = useCallback(() => loadInvites().then(setData), []);

  useEffect(() => {
    loadInvites().then(setData);
    const id = requestAnimationFrame(() => setOrigin(window.location.origin));
    return () => cancelAnimationFrame(id);
  }, []);

  // Nothing to show for users without invites (or before migration 014)
  if (!data || (data.status.balance <= 0 && data.invites.length === 0)) return null;

  const { status, invites } = data;
  const monthLeft = Math.max(0, status.month_limit - status.month_used);
  const canCreate = status.balance > 0 && monthLeft > 0;
  const linkFor = (code: string) => `${origin}/${locale}/auth/register?code=${encodeURIComponent(code)}`;
  const formatDate = (iso: string) => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(iso));

  const create = async () => {
    setBusy(true);
    setError(null);
    const result = await createMyInvite(email, message);
    setBusy(false);
    if (!result.ok) {
      setError(t(`err_${result.error}`));
      return;
    }
    setCreated({ code: result.code, email: result.email });
    setEmail('');
    setMessage('');
    void reload();
  };

  const revoke = async (invite: MyInvite) => {
    const ok = await confirm({
      message: t('revokeConfirm', { email: invite.email }),
      confirmLabel: t('revoke'),
      cancelLabel: t('cancel'),
      destructive: true,
    });
    if (!ok) return;
    await createClient().rpc('revoke_user_invite', { p_id: invite.id });
    if (created && invite.code === created.code) setCreated(null);
    void reload();
  };

  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between gap-3 text-gradient-gold">
          <span>{t('title')}</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Ticket className="h-4 w-4 text-accent" />
            {t('balance', { count: status.balance })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {status.balance > 0 && (
          <p className="text-xs text-muted-foreground">
            {monthLeft > 0 ? t('monthLeft', { count: monthLeft }) : t('monthLimitReached')} · {t('validity')}
          </p>
        )}

        {canCreate && (
          <div className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              aria-label={t('email')}
              className={cn(fieldClass, 'h-10')}
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder={t('messagePlaceholder')}
              aria-label={t('message')}
              className={cn(fieldClass, 'resize-none py-2')}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted-foreground">{message.length}/200</span>
              <button
                type="button"
                onClick={() => void create()}
                disabled={busy || !email.trim()}
                className="rounded-xl bg-gradient-to-r from-accent-dark via-accent to-accent-light px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-40"
              >
                {busy ? t('creating') : t('create')}
              </button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        )}

        <Collapse open={created !== null}>
          {created && (
            <div className="space-y-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
              <p className="text-sm text-cream">{t('created', { email: created.email })}</p>
              <ShareButtons link={linkFor(created.code)} shareText={t('shareText')} />
            </div>
          )}
        </Collapse>

        {invites.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">{t('sent')}</p>
            <ul className="divide-y divide-border/30">
              {invites.map((invite) => {
                const state = stateOf(invite);
                return (
                  <li key={invite.id} className="space-y-2 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={cn('truncate text-sm', state === 'pending' || state === 'accepted' ? 'text-cream' : 'text-muted-foreground')}>
                          {invite.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {state === 'pending' && (
                            <>
                              <AppIcon name="hourglass" className="mr-1 h-3 w-3 align-[-2px]" />
                              {t('statusPending', { date: formatDate(invite.expires_at ?? invite.created_at) })}
                            </>
                          )}
                          {state === 'accepted' && (
                            <span className="text-green-400">
                              <AppIcon name="check" className="mr-1 h-3 w-3 align-[-2px] text-current" />
                              {t('statusAccepted', { username: invite.used_username ?? '—' })}</span>
                          )}
                          {state === 'expired' && (
                            <>
                              <AppIcon name="hourglass" className="mr-1 h-3 w-3 align-[-2px] text-muted-foreground" />
                              {t('statusExpired')}
                            </>
                          )}
                          {state === 'revoked' && t('statusRevoked')}
                        </p>
                      </div>
                      {state === 'pending' && (
                        <button
                          type="button"
                          onClick={() => void revoke(invite)}
                          className="shrink-0 text-xs text-red-300/80 transition hover:text-red-300"
                        >
                          {t('revoke')}
                        </button>
                      )}
                    </div>
                    {state === 'pending' && invite.code && <ShareButtons link={linkFor(invite.code)} shareText={t('shareText')} />}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
      {confirmDialog}
    </Card>
  );
}
