'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ElementType, SoulMirrorType } from '@/lib/magia-types';
import type { FeherMagiaContent } from '@/lib/i18n-content';
import { ELEMENT_COLORS } from '@/lib/elements';
import { TRAITS } from '@/lib/magia/traits';
import { mirrorTraits, traitName, type TraitWords } from '@/lib/magia/evening';
import {
  ELEMENTS,
  HONESTY_EXTRA_DAYS,
  effectiveLevel,
  elementBalance,
  gridGroups,
  isCycleReady,
  levelChanges,
  needsHonestyWeek,
  summarize,
  type TraitSummary,
} from '@/lib/magia/mirror';
import type { MirrorData } from '@/lib/magia/mirror-store';
import type { Level, Rating } from '@/lib/magia/types';
import { closeCycle, extendCycle, saveOverrides } from '@/lib/magia/actions';
import { cn } from '@/lib/utils';

interface MirrorViewProps {
  locale: string;
  userId: string;
  data: MirrorData;
  words: Record<string, TraitWords>;
  elements: FeherMagiaContent['elements'];
}

const FILL: Record<number, number> = { 3: 1, 2: 0.58, 1: 0.26 };

/** The "Tükör" tab: the 14-day mirror (the Excel table, filled in by the evenings). */
export function MirrorView({ locale, userId, data, words, elements }: MirrorViewProps) {
  const t = useTranslations('feherMagia.mirror');
  const [mirror, setMirror] = useState<SoulMirrorType>('fekete');
  const [selected, setSelected] = useState<string | null>(null);
  const [showQuiet, setShowQuiet] = useState(false);
  const [cycle, setCycle] = useState(data.cycle);
  const [overrides, setOverrides] = useState<Record<string, Level>>(data.cycle?.overrides ?? {});
  const [justClosed, setJustClosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const traits = useMemo(() => mirrorTraits(TRAITS, data.userTraits), [data.userTraits]);
  const ratingsByDay = useMemo(() => data.evenings.map((e) => e.ratings), [data.evenings]);
  const live = useMemo(() => summarize(ratingsByDay, traits.map((tr) => tr.key)), [ratingsByDay, traits]);
  const summary: Record<string, TraitSummary> = cycle?.closed_at && cycle.summary ? cycle.summary : live;
  const changes = useMemo(
    () => (data.previous?.summary ? levelChanges(data.previous.summary, summary) : {}),
    [data.previous, summary]
  );

  if (!cycle) {
    return (
      <section className="rounded-2xl border border-border/50 bg-card/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
        <Link href={`/${locale}/modules/magia/ma`} className="mt-4 inline-block text-sm font-semibold text-accent hover:underline">
          {t('toToday')}
        </Link>
      </section>
    );
  }

  const closed = Boolean(cycle.closed_at);
  const days = data.evenings.length;
  const ready = !closed && isCycleReady(days, cycle.length_days);
  const columns = Math.max(cycle.length_days, days);
  const nameOf = (key: string) => traitName(key, words, data.userTraits);
  const elementOf = (key: string): ElementType | null => traits.find((tr) => tr.key === key)?.element ?? null;
  const { groups, quiet } = gridGroups(traits, mirror, summary, overrides);
  const balance = elementBalance(traits, mirror, summary, overrides);
  const blackCount = traits.filter((tr) => tr.mirror === 'fekete' && effectiveLevel(summary, overrides, tr.key) >= 1).length;
  const honesty = needsHonestyWeek(traits, summary, overrides);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      console.error('[magia] mirror save failed', err);
      setError(t('saveError'));
    } finally {
      setBusy(false);
    }
  };

  const close = () =>
    run(async () => {
      await closeCycle(userId, cycle.id, live, overrides);
      setCycle({ ...cycle, closed_at: new Date().toISOString(), summary: live, overrides });
      setJustClosed(true);
    });

  const moreWeek = () =>
    run(async () => {
      const length = cycle.length_days + HONESTY_EXTRA_DAYS;
      await extendCycle(userId, cycle.id, length);
      setCycle({ ...cycle, length_days: length });
    });

  const setLevel = (key: string, level: Level) =>
    run(async () => {
      const next = { ...overrides, [key]: level };
      // Sorting happens at the close; afterwards it is saved right away
      if (closed) await saveOverrides(userId, cycle.id, next);
      setOverrides(next);
    });

  const dominantText = (m: SoulMirrorType) => {
    const d = elementBalance(traits, m, summary, overrides).dominant;
    return d ? t(m === 'fekete' ? 'closedBlack' : 'closedWhite', { element: elements.names[d], temperament: elements.temperaments[d] }) : null;
  };

  const cell = (rating: Rating | undefined, el: ElementType | null, future: boolean) => {
    const color = el ? ELEMENT_COLORS[el] : '#a89bb8';
    if (future) return <span className="block aspect-square w-full rounded-[3px] border border-dashed border-border/30" />;
    if (rating === '?') return <span className="block aspect-square w-full rounded-[3px] border border-dashed" style={{ borderColor: color }} />;
    if (!rating) return <span className="block aspect-square w-full rounded-[3px] bg-muted/25" />;
    return <span className="block aspect-square w-full rounded-[3px]" style={{ background: color, opacity: FILL[rating] }} />;
  };

  const row = (key: string) => {
    const el = elementOf(key);
    const level = effectiveLevel(summary, overrides, key);
    const change = changes[key] ?? 0;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setSelected(selected === key ? null : key)}
        aria-expanded={selected === key}
        className={cn(
          'grid w-full items-center gap-[2px] rounded-md px-1 py-[3px] text-left transition',
          selected === key ? 'bg-accent/10' : 'hover:bg-card/60'
        )}
        style={{ gridTemplateColumns: `minmax(0, 6.6rem) repeat(${columns}, minmax(0, 1fr)) 0.9rem 0.7rem` }}
      >
        <span className="truncate pr-1 text-[0.8rem] text-cream">{nameOf(key)}</span>
        {Array.from({ length: columns }, (_, i) => (
          <span key={i} className="block">
            {cell(ratingsByDay[i]?.[key], el, i >= days)}
          </span>
        ))}
        <span className="block aspect-square w-full rounded-full" style={{ background: el ? ELEMENT_COLORS[el] : '#a89bb8', opacity: level ? FILL[level] : 0.12 }} />
        <span className="text-center text-[0.65rem] text-accent" aria-label={change ? t(change > 0 ? 'changeUp' : 'changeDown') : undefined}>
          {change > 0 ? '↑' : change < 0 ? '↓' : ''}
        </span>
      </button>
    );
  };

  const detail = selected ? (
    <MirrorDetail
      name={nameOf(selected)}
      element={elementOf(selected)}
      elementNames={elements.names}
      summary={summary[selected]}
      level={effectiveLevel(summary, overrides, selected)}
      notes={data.notes.filter((n) => n.trait_key === selected && n.note)}
      canSort={closed || ready}
      busy={busy}
      onLevel={(l) => setLevel(selected, l)}
    />
  ) : null;

  const totalBalance = ELEMENTS.reduce((s, el) => s + balance.totals[el], 0) || 1;

  return (
    <div className="space-y-5">
      {/* Cycle header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          <b className="text-cream">{t('cycle', { n: cycle.number })}</b> · {t('days', { days, length: cycle.length_days })} · {closed ? t('closed') : t('open')}
        </span>
        {data.cycles.length > 1 && (
          <span className="flex flex-wrap gap-1.5">
            {data.cycles.map((c) => (
              <Link
                key={c.id}
                href={`/${locale}/modules/magia/tukor?ciklus=${c.number}`}
                className={cn('rounded-lg border px-2 py-0.5', c.number === cycle.number ? 'border-accent/50 text-accent' : 'border-border/50')}
              >
                {c.number}.
              </Link>
            ))}
          </span>
        )}
      </div>

      {/* Closing the cycle: the two soul mirrors */}
      {ready && (
        <section className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-accent/5 p-5">
          <h2 className="font-display text-xl font-semibold text-gradient-gold">{t('readyTitle')}</h2>
          <p className="text-sm text-cream/90">{t('readyBody', { days })}</p>
          {honesty ? (
            <>
              <p className="text-sm font-semibold text-cream">{t('honestyTitle', { count: blackCount })}</p>
              <p className="text-sm italic text-muted-foreground">{t('honestyQuote')}</p>
              <p className="text-sm text-cream">{t('honestyAsk')}</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} onClick={close} className="rounded-xl border border-border/50 px-3 py-2.5 text-sm text-cream">
                  {t('ready')}
                </button>
                <button type="button" disabled={busy} onClick={moreWeek} className="rounded-xl bg-accent/20 px-3 py-2.5 text-sm font-semibold text-accent">
                  {t('moreWeek')}
                </button>
              </div>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={close} className="rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent">
              {t('close', { days })}
            </button>
          )}
        </section>
      )}
      {justClosed && (
        <section className="flex flex-col gap-2 rounded-2xl border border-accent/40 bg-accent/5 p-5">
          <h2 className="font-display text-xl font-semibold text-gradient-gold">{t('closedTitle')}</h2>
          {dominantText('fekete') && <p className="text-sm text-cream">{dominantText('fekete')}</p>}
          {dominantText('feher') && <p className="text-sm text-cream">{dominantText('feher')}</p>}
          <p className="text-sm italic text-muted-foreground">{t('closedQuote')}</p>
          <p className="text-sm text-muted-foreground">{t('nextCycle')}</p>
        </section>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Mirror switch */}
      <div className="flex rounded-xl border border-border/50 bg-card/30 p-1" role="group">
        {(['fekete', 'feher'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMirror(m);
              setSelected(null);
            }}
            aria-pressed={mirror === m}
            className={cn('flex-1 rounded-lg px-2 py-2 text-sm transition', mirror === m ? 'bg-accent/15 font-semibold text-accent' : 'text-muted-foreground')}
          >
            {t(m === 'fekete' ? 'black' : 'white')}
          </button>
        ))}
      </div>

      {/* The grid */}
      <section className="rounded-2xl border border-border/50 bg-card/30 p-2 sm:p-3">
        <div
          className="grid items-end gap-[2px] px-1 pb-1 text-center text-[0.55rem] tabular-nums text-muted-foreground"
          style={{ gridTemplateColumns: `minmax(0, 6.6rem) repeat(${columns}, minmax(0, 1fr)) 0.9rem 0.7rem` }}
          aria-hidden
        >
          <span />
          {Array.from({ length: columns }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
          <span>{t('summaryHead')}</span>
          <span />
        </div>
        {groups.length === 0 && <p className="px-1 py-3 text-sm text-muted-foreground">{t('none')}</p>}
        {groups.map((g) => (
          <div key={g.element ?? 'none'}>
            <p
              className="px-1 pb-0.5 pt-2 text-[0.65rem] font-bold uppercase tracking-[0.14em]"
              style={{ color: g.element ? ELEMENT_COLORS[g.element] : undefined }}
            >
              {g.element ? `${elements.names[g.element]} · ${elements.temperaments[g.element]}` : t('unclassified')}
            </p>
            {g.keys.map((key) => (
              <div key={key}>
                {row(key)}
                {selected === key && detail}
              </div>
            ))}
          </div>
        ))}
        {quiet.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowQuiet((v) => !v)}
              aria-expanded={showQuiet}
              className="w-full px-1 pb-0.5 pt-3 text-left text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground"
            >
              {showQuiet ? '▾' : '▸'} {t('notCharacteristic')} · {t('count', { count: quiet.length })}
            </button>
            {showQuiet &&
              quiet.map((key) => (
                <div key={key}>
                  {row(key)}
                  {selected === key && detail}
                </div>
              ))}
          </div>
        )}
        <p className="flex flex-wrap gap-x-3 gap-y-1 px-1 pt-3 text-[0.65rem] text-muted-foreground">
          <span>{t('legend')}</span>
        </p>
      </section>

      {/* Elements */}
      <section className="space-y-2 rounded-2xl border border-border/50 bg-card/30 p-4">
        <p className="text-xs text-muted-foreground">
          {t('elementsTitle', { mirror: t(mirror === 'fekete' ? 'black' : 'white').toLowerCase() })}
          {balance.dominant && (
            <>
              {' · '}
              <b className="text-cream">{t('dominant', { element: elements.names[balance.dominant] })}</b>
            </>
          )}
        </p>
        {ELEMENTS.map((el) => {
          const pct = Math.round((balance.totals[el] / totalBalance) * 100);
          return (
            <div key={el} className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-2 text-xs">
              <span className="text-cream">{elements.names[el]}</span>
              <span className="h-2 overflow-hidden rounded-full bg-muted/30">
                <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: ELEMENT_COLORS[el] }} />
              </span>
              <span className="text-right tabular-nums text-muted-foreground">{pct}%</span>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function MirrorDetail(props: {
  name: string;
  element: ElementType | null;
  elementNames: Record<ElementType, string>;
  summary: TraitSummary | undefined;
  level: Level;
  notes: { obs_date: string; note: string | null }[];
  canSort: boolean;
  busy: boolean;
  onLevel: (level: Level) => void;
}) {
  const t = useTranslations('feherMagia.mirror');
  const s = props.summary;
  return (
    <div className="mx-1 my-1 flex flex-col gap-2 rounded-xl border border-border/50 bg-background/50 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <b className="text-cream">{props.name}</b>
        {props.element && (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: ELEMENT_COLORS[props.element] }}>
            <span className="h-2 w-2 rounded-full" style={{ background: ELEMENT_COLORS[props.element] }} />
            {props.elementNames[props.element]}
          </span>
        )}
      </div>
      {s && (
        <p className="text-xs text-muted-foreground">
          {t('avg', { avg: s.avg.toFixed(1).replace('.', ',') })} · {t('present', { days: s.days })}
          {s.unsure > 0 && ` · ${t('unsureDays', { days: s.unsure })}`}
        </p>
      )}
      {props.notes.length > 0 && (
        <div className="space-y-1">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('notes')}</p>
          <ul className="space-y-1 text-xs text-cream/90">
            {props.notes.map((n, i) => (
              <li key={i}>
                <span className="tabular-nums text-muted-foreground">{n.obs_date.slice(5).replace('-', '.')}.</span> {n.note}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('levelTitle')}</p>
      {props.canSort ? (
        <div className="grid grid-cols-4 gap-1.5">
          {([3, 2, 1, 0] as const).map((l) => (
            <button
              key={l}
              type="button"
              disabled={props.busy}
              onClick={() => props.onLevel(l)}
              aria-pressed={props.level === l}
              className={cn(
                'rounded-lg border px-1 py-1.5 text-xs transition',
                props.level === l ? 'border-accent/60 bg-accent/10 font-semibold text-accent' : 'border-border/50 text-cream'
              )}
            >
              {t(`level${l}`)}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t(`level${props.level}`)} · {t('openHint')}
        </p>
      )}
      {props.canSort && <p className="text-xs text-muted-foreground">{t('sortHint')}</p>}
    </div>
  );
}

