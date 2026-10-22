'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ElementType, SoulMirrorType } from '@/lib/magia-types';
import { normalize, searchTraits, type SearchEntry } from '@/lib/magia/search';
import { ELEMENT_COLORS } from '@/lib/elements';
import { cn } from '@/lib/utils';

export interface TraitPick {
  kind: 'mine' | 'dict' | 'new';
  /** Dictionary key or `own:<id>` (mine, dict); none for a new word */
  key?: string;
  name: string;
  mirror: SoulMirrorType;
  /** null = unclassified ("Nem tudom"); undefined = a new word whose element is not chosen yet */
  element?: ElementType | null;
  /** Evening mode: how characteristic (1–3) */
  level?: 1 | 2 | 3;
  /** Day mode: what happened */
  note?: string;
}

interface TraitPickerProps {
  /** 'day' = the "+" note; 'obs' = adding a trait at the end of the evening */
  mode: 'day' | 'obs';
  entries: SearchEntry[];
  /** Element of an entry, if it has one */
  elementOf: (key: string) => ElementType | null;
  hints: Record<SoulMirrorType, Record<ElementType, string>>;
  elementNames: Record<ElementType, string>;
  onSave: (pick: TraitPick) => Promise<string>;
}

const ELEMENTS: ElementType[] = ['tuz', 'levego', 'viz', 'fold'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Search a trait by any word form; if it is not there, write it as an own word
 * and pick its element with the help of short element descriptions.
 */
export function TraitPicker({ mode, entries, elementOf, hints, elementNames, onSave }: TraitPickerProps) {
  const t = useTranslations('feherMagia.picker');
  const tEvening = useTranslations('feherMagia.evening');
  const [mirror, setMirror] = useState<SoulMirrorType>('fekete');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<TraitPick | null>(null);
  const [level, setLevel] = useState<1 | 2 | 3 | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(() => searchTraits(query, entries, mirror), [query, entries, mirror]);

  const reset = () => {
    setPicked(null);
    setLevel(null);
    setNote('');
  };

  const choose = (p: TraitPick) => {
    setPicked(p);
    setLevel(null);
    setToast(null);
  };

  const canSave = picked && (picked.kind !== 'new' || picked.element !== undefined) && (mode === 'day' || level !== null);

  const save = async () => {
    if (!picked || !canSave) return;
    setBusy(true);
    setError(null);
    try {
      const message = await onSave({ ...picked, ...(level ? { level } : {}), ...(note.trim() ? { note: note.trim() } : {}) });
      setToast(message);
      reset();
      setQuery('');
    } catch (err) {
      console.error('[magia] trait save failed', err);
      setError(tEvening('saveError'));
    } finally {
      setBusy(false);
    }
  };

  const resultButton = (e: SearchEntry, label: string, disabled = false) => {
    const el = elementOf(e.key);
    const on = picked?.key === e.key;
    return (
      <button
        key={e.key}
        type="button"
        disabled={disabled}
        onClick={() => choose({ kind: e.source === 'dict' ? 'dict' : 'mine', key: e.key, name: cap(e.name), mirror, element: el })}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition disabled:opacity-50',
          on ? 'border-accent/60 bg-accent/10' : 'border-border/50 bg-card/30'
        )}
      >
        <span className="flex items-center gap-2 text-cream">
          <span className="h-2 w-2 rounded-full" style={{ background: el ? ELEMENT_COLORS[el] : 'currentColor' }} aria-hidden />
          {cap(e.name)}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </button>
    );
  };

  const exactTyped = query.trim() && !result.exact;
  const newName = cap(query.trim());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex rounded-xl border border-border/50 bg-background/40 p-1" role="group">
        {(['fekete', 'feher'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMirror(m);
              reset();
              setToast(null);
            }}
            aria-pressed={mirror === m}
            className={cn('flex-1 rounded-lg px-2 py-1.5 text-xs transition', mirror === m ? 'bg-accent/15 font-semibold text-accent' : 'text-muted-foreground')}
          >
            {t(m)}
          </button>
        ))}
      </div>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          reset();
          setToast(null);
        }}
        placeholder={t(mode === 'day' ? 'placeholderDay' : 'placeholderObs')}
        aria-label={t(mode === 'day' ? 'placeholderDay' : 'placeholderObs')}
        className="rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-base text-cream"
        autoComplete="off"
      />

      {normalize(query).length >= 2 && (
        <div className="flex flex-col gap-2">
          {result.mine.length > 0 && <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('mine')}</p>}
          {result.mine.map((e) => resultButton(e, mode === 'day' ? t('markToday') : t('inCards'), mode === 'obs'))}
          {result.dict.length > 0 && <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('dict')}</p>}
          {result.dict.map((e) => resultButton(e, t('suggested')))}
          {exactTyped && (
            <button
              type="button"
              onClick={() => choose({ kind: 'new', name: newName, mirror })}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition',
                picked?.kind === 'new' ? 'border-accent/60 bg-accent/10' : 'border-dashed border-border/60'
              )}
            >
              <span className="text-cream">{t('own', { word: newName })}</span>
              <span className="text-xs text-muted-foreground">{t('ownSmall')}</span>
            </button>
          )}
        </div>
      )}

      {picked && (
        <div className="flex flex-col gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-3">
          {(picked.kind === 'new' || picked.kind === 'dict') && (
            <>
              <p className="text-sm text-cream">
                {picked.kind === 'new' ? t('whichElement', { word: picked.name }) : t('suggestedElement')}
              </p>
              <div className="flex flex-col gap-1.5">
                {ELEMENTS.map((el) => (
                  <button
                    key={el}
                    type="button"
                    onClick={() => setPicked({ ...picked, element: el })}
                    aria-pressed={picked.element === el}
                    className={cn(
                      'grid grid-cols-[10px_auto_1fr] items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition',
                      picked.element === el ? 'border-accent/60 bg-accent/10' : 'border-border/50'
                    )}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: ELEMENT_COLORS[el] }} aria-hidden />
                    <b className="font-semibold text-cream">{elementNames[el]}</b>
                    <span className="text-xs text-muted-foreground">{picked.kind === 'new' ? hints[mirror][el] : ''}</span>
                  </button>
                ))}
                {picked.kind === 'new' && (
                  <button
                    type="button"
                    onClick={() => setPicked({ ...picked, element: null })}
                    aria-pressed={picked.element === null}
                    className={cn(
                      'grid grid-cols-[10px_auto_1fr] items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition',
                      picked.element === null ? 'border-accent/60 bg-accent/10' : 'border-border/50'
                    )}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" aria-hidden />
                    <b className="font-semibold text-cream">{t('dontKnow')}</b>
                    <span className="text-xs text-muted-foreground">{t('dontKnowHint')}</span>
                  </button>
                )}
              </div>
            </>
          )}
          {mode === 'obs' && (
            <>
              <p className="text-xs text-muted-foreground">{t('howMuch')}</p>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setLevel(v)}
                    aria-pressed={level === v}
                    className={cn(
                      'rounded-xl border px-2 py-2 text-sm transition',
                      level === v ? 'border-accent/60 bg-accent/10 font-semibold text-accent' : 'border-border/50 text-cream'
                    )}
                  >
                    {tEvening(`rating${v}`)}
                  </button>
                ))}
              </div>
            </>
          )}
          {mode === 'day' && (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('whatHappened')}
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                placeholder={t('whatPlaceholder')}
                className="rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-base text-cream"
              />
            </label>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      {toast && <p className="text-sm text-accent">{toast}</p>}

      <button
        type="button"
        onClick={save}
        disabled={!canSave || busy}
        className="rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/30 disabled:opacity-40"
      >
        {t(mode === 'day' ? 'saveDay' : 'saveObs')}
      </button>
    </div>
  );
}
