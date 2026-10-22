'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BOOK_BODY_ITEMS, MORE_BODY_ITEMS, defaultBodyItem } from '@/lib/magia/path';
import type { BodyItem, DayPart } from '@/lib/magia/types';
import { normalize } from '@/lib/magia/search';
import { cn } from '@/lib/utils';

interface BodySetupProps {
  /** Labels of the built-in items (content file) */
  labels: Record<string, string>;
  /** The current plan; empty on the first morning */
  initial: BodyItem[];
  onSave: (plan: BodyItem[]) => Promise<void>;
}

const PARTS: DayPart[] = ['reggel', 'napkozben', 'este'];

/** "A test iskolázása": what the user does, then when and how often (two steps). */
export function BodySetup({ labels, initial, onSave }: BodySetupProps) {
  const t = useTranslations('feherMagia.body');
  const tBlocks = useTranslations('feherMagia.blocks');
  const tFlow = useTranslations('feherMagia.flow');
  const [step, setStep] = useState<'pick' | 'when'>('pick');
  const [plan, setPlan] = useState<BodyItem[]>(() =>
    initial.length ? initial : BOOK_BODY_ITEMS.map((key) => defaultBodyItem(key))
  );
  const [own, setOwn] = useState<BodyItem[]>(() => initial.filter((i) => i.key.startsWith('own_')));
  const [ownText, setOwnText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labelOf = (item: BodyItem) => item.label ?? labels[item.key] ?? item.key;
  const chosen = (key: string) => plan.some((i) => i.key === key);
  const toggle = (item: BodyItem) =>
    setPlan((p) => (p.some((i) => i.key === item.key) ? p.filter((i) => i.key !== item.key) : [...p, item]));
  const update = (key: string, patch: Partial<BodyItem>) =>
    setPlan((p) => p.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const addOwn = () => {
    const label = ownText.trim();
    if (!label) return;
    const existing = [...BOOK_BODY_ITEMS, ...MORE_BODY_ITEMS].find((k) => normalize(labels[k] ?? '') === normalize(label));
    const existingOwn = own.find((i) => normalize(i.label ?? '') === normalize(label));
    if (existing || existingOwn) {
      const item = existingOwn ?? defaultBodyItem(existing!);
      if (!chosen(item.key)) setPlan((p) => [...p, item]);
    } else {
      const next = 1 + Math.max(0, ...own.map((i) => parseInt(i.key.slice(4), 10) || 0));
      const item = defaultBodyItem(`own_${next}`, label.charAt(0).toUpperCase() + label.slice(1));
      setOwn((o) => [...o, item]);
      setPlan((p) => [...p, item]);
    }
    setOwnText('');
  };

  const toggleDay = (item: BodyItem, day: number) => {
    const days = item.days ? [...item.days] : [];
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
    update(item.key, { days: next.length === 0 || next.length === 7 ? null : next });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      // Keep the order: the book's items, the offered ones, then the user's own
      const order = [...BOOK_BODY_ITEMS, ...MORE_BODY_ITEMS, ...own.map((i) => i.key)] as string[];
      await onSave([...plan].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key)));
    } catch (err) {
      console.error('[magia] body plan save failed', err);
      setError(tFlow('saveError'));
      setSaving(false);
    }
  };

  const option = (item: BodyItem, book: boolean) => (
    <button
      key={item.key}
      type="button"
      onClick={() => toggle(chosen(item.key) ? plan.find((i) => i.key === item.key)! : item)}
      aria-pressed={chosen(item.key)}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition',
        chosen(item.key) ? 'border-accent/50 bg-accent/10 text-cream' : 'border-border/50 bg-card/30 text-muted-foreground'
      )}
    >
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]',
          chosen(item.key) ? 'border-accent bg-accent text-accent-foreground' : 'border-muted-foreground/40'
        )}
      >
        {chosen(item.key) ? '✓' : ''}
      </span>
      <span className="flex-1">{labelOf(item)}</span>
      {book && (
        <span className="rounded-md border border-border/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {t('fromBook')}
        </span>
      )}
    </button>
  );

  if (step === 'pick') {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-cream">{t('pickTitle')}</h2>
          <span className="text-xs text-muted-foreground">{t('step', { n: 1 })}</span>
        </div>
        <p className="text-sm text-muted-foreground">{t('pickHint')}</p>
        <div className="flex flex-col gap-2">{BOOK_BODY_ITEMS.map((key) => option(defaultBodyItem(key), true))}</div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('moreTitle')}</p>
        <div className="flex flex-col gap-2">
          {MORE_BODY_ITEMS.map((key) => option(defaultBodyItem(key), false))}
          {own.map((item) => option(item, false))}
        </div>
        <div className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
            {t('ownLabel')}
            <input
              value={ownText}
              onChange={(e) => setOwnText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addOwn()}
              maxLength={40}
              placeholder={t('ownPlaceholder')}
              className="rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-base text-cream"
            />
          </label>
          <button
            type="button"
            onClick={addOwn}
            className="rounded-xl border border-border/50 px-3 py-2.5 text-sm text-cream transition hover:border-accent/40"
          >
            {t('add')}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setStep('when')}
          disabled={plan.length === 0}
          className="mt-auto rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/30 disabled:opacity-40"
        >
          {t('pickNext', { count: plan.length })}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-cream">{t('whenTitle')}</h2>
        <span className="text-xs text-muted-foreground">{t('step', { n: 2 })}</span>
      </div>
      <p className="text-sm text-muted-foreground">{t('whenHint')}</p>
      <div className="flex flex-col gap-3">
        {plan.map((item) => (
          <div key={item.key} className="flex flex-col gap-2 rounded-xl border border-border/50 bg-card/30 p-3">
            <span className="text-sm font-semibold text-cream">{labelOf(item)}</span>
            <div className="flex rounded-xl border border-border/50 bg-background/40 p-1" role="group" aria-label={labelOf(item)}>
              {PARTS.map((part) => (
                <button
                  key={part}
                  type="button"
                  onClick={() => update(item.key, { when: part })}
                  aria-pressed={item.when === part}
                  className={cn(
                    'flex-1 rounded-lg px-2 py-1.5 text-xs transition',
                    item.when === part ? 'bg-accent/15 font-semibold text-accent' : 'text-muted-foreground'
                  )}
                >
                  {tBlocks(part)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => update(item.key, { days: null })}
                aria-pressed={item.days === null}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs transition',
                  item.days === null ? 'border-accent/50 bg-accent/10 font-semibold text-accent' : 'border-border/50 text-muted-foreground'
                )}
              >
                {t('everyDay')}
              </button>
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(item, d)}
                  aria-pressed={Boolean(item.days?.includes(d))}
                  className={cn(
                    'min-w-9 rounded-lg border px-2 py-1 text-xs transition',
                    item.days?.includes(d) ? 'border-accent/50 bg-accent/10 font-semibold text-accent' : 'border-border/50 text-muted-foreground'
                  )}
                >
                  {t(`d${d}`)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="mt-auto flex gap-3">
        <button
          type="button"
          onClick={() => setStep('pick')}
          className="flex-1 rounded-xl border border-border/50 px-4 py-3 text-sm text-cream transition hover:border-accent/40"
        >
          {t('back')}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/30 disabled:opacity-50"
        >
          {t('save')}
        </button>
      </div>
    </div>
  );
}
