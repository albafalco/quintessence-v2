'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ElementType } from '@/lib/magia-types';
import { buildEveningCards, summarize, type EveningCard } from '@/lib/magia/mirror';
import type { MirrorTrait, Rating, Ratings } from '@/lib/magia/types';
import { ELEMENT_COLORS } from '@/lib/elements';
import { cn } from '@/lib/utils';

interface EveningCardsProps {
  traits: MirrorTrait[];
  /** Completed evenings of this cycle before tonight: they put the marked traits first */
  cycleEvenings: Ratings[];
  names: (key: string) => string;
  questions: (key: string) => string | undefined;
  elementNames: Record<ElementType, string>;
  /** Traits noted with "+" today */
  noteKeys: string[];
  initialRatings: Ratings;
  /** Card to start from (an interrupted evening goes on where it stopped) */
  initialCard: number;
  /** Saves tonight's ratings and the next card's index */
  onSave: (ratings: Ratings, nextCard: number) => Promise<void>;
  onDone: (ratings: Ratings) => void;
}

/**
 * The whole list, one element per card: three dots per trait (a little,
 * moderately, very), "?" for not sure; what is not marked was not
 * characteristic today.
 */
export function EveningCards(props: EveningCardsProps) {
  const t = useTranslations('feherMagia.evening');
  const { traits, names, questions, onSave } = props;
  const cards: EveningCard[] = useMemo(
    () => buildEveningCards(traits, summarize(props.cycleEvenings, traits.map((tr) => tr.key))),
    // The cards are fixed for the evening, so a resumed evening finds the same ones
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const elementOf = useMemo(() => new Map(traits.map((tr) => [tr.key, tr.element])), [traits]);
  const [index, setIndex] = useState(Math.min(props.initialCard, Math.max(0, cards.length - 1)));
  const [ratings, setRatings] = useState<Ratings>(props.initialRatings);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const card = cards[index];

  const setRating = (key: string, value: Rating | null) =>
    setRatings((r) => {
      const next = { ...r };
      if (value === null) delete next[key];
      else next[key] = value;
      return next;
    });

  const tapDot = (key: string, v: 1 | 2 | 3) => setRating(key, ratings[key] === v ? null : v);
  const tapUnsure = (key: string) => setRating(key, ratings[key] === '?' ? null : '?');

  const go = async (to: number) => {
    setBusy(true);
    setError(null);
    try {
      const next = Math.min(to, cards.length);
      await onSave(ratings, next);
      setOpen(null);
      if (next >= cards.length) props.onDone(ratings);
      else setIndex(next);
    } catch (err) {
      console.error('[magia] evening save failed', err);
      setError(t('saveError'));
    } finally {
      setBusy(false);
    }
  };

  if (!card) return null;
  const prev = cards[index - 1];
  const switchedMirror = prev && prev.mirror !== card.mirror;
  const title = card.kind === 'marked' ? t('marked') : card.element ? props.elementNames[card.element] : t('unclassified');
  const accent = card.element ? ELEMENT_COLORS[card.element] : undefined;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="h-1 overflow-hidden rounded-full bg-muted/40" aria-hidden>
        <div className="h-full bg-accent transition-all" style={{ width: `${((index + 1) / cards.length) * 100}%` }} />
      </div>
      {switchedMirror && <p className="text-sm text-accent">{t('blackDone')}</p>}

      <article className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/40 p-4" style={accent ? { borderTop: `3px solid ${accent}` } : undefined}>
        <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          <span>
            {t(card.mirror === 'fekete' ? 'black' : 'white')} · <span className="tabular-nums">{t('cardOf', { n: index + 1, total: cards.length })}</span>
          </span>
          {card.kind === 'marked' && <span className="rounded-md bg-accent/10 px-2 py-0.5 normal-case tracking-normal text-accent">{t('byStrength')}</span>}
        </div>
        <h2 className="font-display text-2xl font-semibold text-cream">{title}</h2>
        <p className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
          <span>● {t('rating1').toLowerCase()}</span>
          <span>●● {t('rating2').toLowerCase()}</span>
          <span>●●● {t('rating3').toLowerCase()}</span>
          <span>? {t('unsureShort')}</span>
        </p>
        <ul className="flex flex-col">
          {card.keys.map((key) => {
            const r = ratings[key];
            const unsure = r === '?';
            const level = typeof r === 'number' ? r : 0;
            const el = elementOf.get(key) ?? null;
            const color = el ? ELEMENT_COLORS[el] : '#a89bb8';
            const q = questions(key);
            return (
              <li key={key} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1 border-b border-border/40 py-0.5 last:border-0">
                <button
                  type="button"
                  onClick={() => setOpen(open === key ? null : key)}
                  aria-expanded={open === key}
                  disabled={!q}
                  className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 py-2 text-left text-[0.95rem] text-cream disabled:cursor-default"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
                  <span>{names(key)}</span>
                  {props.noteKeys.includes(key) && (
                    <span className="rounded-md border border-accent/40 px-1.5 text-[10px] text-accent">{t('dayTag')}</span>
                  )}
                </button>
                <span className="flex">
                  {([1, 2, 3] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => tapDot(key, v)}
                      aria-pressed={level === v}
                      aria-label={`${names(key)}: ${t(`rating${v}`)}`}
                      className="grid h-10 w-9 place-items-center"
                    >
                      <span
                        className="block h-4 w-4 rounded-full border-[1.5px] transition-colors"
                        style={{ borderColor: color, background: !unsure && level >= v ? color : 'transparent' }}
                      />
                    </button>
                  ))}
                </span>
                <button
                  type="button"
                  onClick={() => tapUnsure(key)}
                  aria-pressed={unsure}
                  aria-label={`${names(key)}: ${t('unsure')}`}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-full border text-xs transition',
                    unsure ? 'border-accent bg-accent/15 font-semibold text-accent' : 'border-dashed border-border/70 text-muted-foreground'
                  )}
                >
                  ?
                </button>
                {open === key && q && <p className="col-span-3 mb-2 rounded-lg bg-muted/30 px-3 py-2 text-sm text-muted-foreground">{q}</p>}
              </li>
            );
          })}
        </ul>
      </article>
      <p className="text-xs text-muted-foreground">{t('rowHint')}</p>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="mt-auto flex gap-3">
        {index > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => go(index - 1)}
            className="flex-1 rounded-xl border border-border/50 px-4 py-3 text-sm text-cream transition hover:border-accent/40 disabled:opacity-50"
          >
            {t('back')}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => go(index + 1)}
          className="flex-1 rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/30 hover:shadow-glow-gold disabled:opacity-50"
        >
          {t('next')}
        </button>
      </div>
    </div>
  );
}
