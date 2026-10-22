'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toIntlLocale } from '@/i18n';
import { NAME_PART_MAX, formatFullName, isValidNamePart, lastNameFirst, normalizeNamePart } from '@/lib/person-name';
import { cn } from '@/lib/utils';

export interface PendingNameChange {
  first_name: string;
  last_name: string;
}

interface NameCardProps {
  firstName: string;
  lastName: string;
  /** Pending request waiting for the admin */
  pending: PendingNameChange | null;
  /** ISO date from when a new change may be asked for; null = now */
  nextChangeAt: string | null;
}

type RequestResult = 'ok' | 'invalid' | 'unchanged' | 'cooldown';

const ERROR_KEYS: Record<Exclude<RequestResult, 'ok'>, string> = {
  invalid: 'nameErrInvalid',
  unchanged: 'nameErrUnchanged',
  cooldown: 'nameErrCooldown',
};

/** Profile → Account: the name can only be changed by a request the admin approves. */
export function NameCard({ firstName, lastName, pending: initialPending, nextChangeAt }: NameCardProps) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [pending, setPending] = useState(initialPending);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const locked = Boolean(nextChangeAt);
  const changed = normalizeNamePart(first) !== firstName || normalizeNamePart(last) !== lastName;
  const valid = isValidNamePart(first) && isValidNamePart(last);
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(toIntlLocale(locale), { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso));

  const submit = async () => {
    setMessage(null);
    if (!valid) return setMessage({ ok: false, text: t('nameErrInvalid') });
    setBusy(true);
    const { data, error } = await createClient().rpc('request_name_change', {
      p_first: normalizeNamePart(first),
      p_last: normalizeNamePart(last),
    });
    setBusy(false);
    const result = (error ? null : data) as RequestResult | null;
    if (result === 'ok') {
      setPending({ first_name: normalizeNamePart(first), last_name: normalizeNamePart(last) });
      setMessage({ ok: true, text: t('nameRequested') });
    } else {
      if (error) console.error('[profile] name change request failed', error);
      setMessage({ ok: false, text: t(result ? ERROR_KEYS[result] : 'nameErrGeneric') });
    }
  };

  const cancel = async () => {
    setBusy(true);
    const { error } = await createClient().rpc('cancel_name_change');
    setBusy(false);
    if (error) return setMessage({ ok: false, text: t('nameErrGeneric') });
    setPending(null);
    setFirst(firstName);
    setLast(lastName);
    setMessage(null);
  };

  const fields = [
    { id: 'last-name', label: t('lastName'), value: last, set: setLast, autoComplete: 'family-name' },
    { id: 'first-name', label: t('firstName'), value: first, set: setFirst, autoComplete: 'given-name' },
  ];
  if (!lastNameFirst(locale)) fields.reverse();

  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="text-gradient-gold">{t('nameTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{t('nameHint')}</p>

        {pending ? (
          <div className="flex flex-col gap-3 rounded-xl border border-accent/25 bg-accent/5 p-3 sm:flex-row sm:items-center">
            <Clock className="hidden h-4 w-4 shrink-0 text-accent sm:block" />
            <p className="flex-1 text-sm text-cream/90">
              {t('namePending', { name: formatFullName(pending.first_name, pending.last_name, locale) })}
            </p>
            <button
              type="button"
              onClick={() => void cancel()}
              disabled={busy}
              className="shrink-0 text-xs font-medium text-muted-foreground transition hover:text-red-300 disabled:opacity-50"
            >
              {t('nameCancel')}
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.id} className="space-y-1.5">
                  <Label htmlFor={f.id}>{f.label}</Label>
                  <Input
                    id={f.id}
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    maxLength={NAME_PART_MAX}
                    autoComplete={f.autoComplete}
                    disabled={locked || busy}
                  />
                </div>
              ))}
            </div>
            {locked ? (
              <p className="text-xs text-muted-foreground">{t('nameCooldown', { date: formatDate(nextChangeAt!) })}</p>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={busy || !changed}
                  className="rounded-xl bg-gradient-to-r from-accent-dark via-accent to-accent-light px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-40"
                >
                  {busy ? t('saving') : t('nameRequest')}
                </button>
              </div>
            )}
          </>
        )}

        {message && <p className={cn('text-xs', message.ok ? 'text-green-400' : 'text-red-400')}>{message.text}</p>}
      </CardContent>
    </Card>
  );
}
