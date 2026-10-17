'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Globe, Search } from 'lucide-react';
import { locales, type Locale } from '@/i18n';
import { LANGUAGES, LANGUAGE_SEARCH_THRESHOLD, getLanguage, localizedLanguageName, matchLocales } from '@/lib/languages';
import { cn } from '@/lib/utils';

/** Flag + language code, e.g. [🇩🇪 DE]; a globe where no single country fits. */
export function LanguageBadge({ code, className }: { code: string; className?: string }) {
  const language = getLanguage(code);
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 rounded-md border border-accent/25 bg-accent/5 px-1 text-[10px] font-bold tracking-wider text-accent',
        className
      )}
      aria-hidden
    >
      {language?.flag ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG, no optimisation needed
        <img src={language.flag.src} alt="" width={16} height={12} loading="lazy" className="h-3 w-4 rounded-[2px] object-cover" />
      ) : (
        <Globe className="h-3 w-3" />
      )}
      {code.toUpperCase()}
    </span>
  );
}

interface LanguageListProps {
  onPick: (code: Locale) => void;
  /** role for the rows inside a menu */
  itemRole?: 'menuitemradio';
}

/**
 * Searchable list: suggested languages (current + browser) first, then all.
 * The search field only appears once there are many languages.
 */
export function LanguageList({ onPick, itemRole }: LanguageListProps) {
  const t = useTranslations('nav');
  const current = useLocale() as Locale;
  const [query, setQuery] = useState('');
  const [browserLocales, setBrowserLocales] = useState<Locale[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchable = locales.length > LANGUAGE_SEARCH_THRESHOLD;

  // navigator only exists in the browser
  useEffect(() => {
    const id = requestAnimationFrame(() => setBrowserLocales(matchLocales(navigator.languages ?? [])));
    if (searchable) searchRef.current?.focus();
    return () => cancelAnimationFrame(id);
  }, [searchable]);

  const rows = useMemo(() => {
    const all = locales.map((code) => ({
      ...LANGUAGES[code],
      localName: localizedLanguageName(code, current),
    }));
    const q = query.trim().toLocaleLowerCase(current);
    const matches = (l: (typeof all)[number]) =>
      !q || [l.code, l.nativeName, l.localName ?? ''].some((v) => v.toLocaleLowerCase(current).includes(q));
    const suggestedCodes = [current, ...browserLocales.filter((c) => c !== current)];
    const suggested = q ? [] : suggestedCodes.map((c) => all.find((l) => l.code === c)!).filter(Boolean);
    const rest = all
      .filter((l) => matches(l) && !suggested.some((s) => s.code === l.code))
      .sort((a, b) => a.nativeName.localeCompare(b.nativeName, current));
    return { suggested, rest };
  }, [current, browserLocales, query]);

  const row = (l: (typeof rows.rest)[number]) => {
    const active = l.code === current;
    return (
      <button
        key={l.code}
        type="button"
        role={itemRole}
        aria-checked={itemRole ? active : undefined}
        lang={l.code}
        onClick={() => onPick(l.code)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition focus-visible:bg-muted/40 focus-visible:outline-none',
          active ? 'text-accent' : 'text-cream/90 hover:bg-muted/40 hover:text-cream'
        )}
      >
        <LanguageBadge code={l.code} />
        <span className="min-w-0 flex-1 truncate font-medium">{l.nativeName}</span>
        {l.localName && l.localName.toLocaleLowerCase(current) !== l.nativeName.toLocaleLowerCase(current) && (
          <span lang={current} className="shrink-0 text-xs text-muted-foreground">
            {l.localName}
          </span>
        )}
        {l.status === 'beta' && (
          <span className="shrink-0 rounded bg-muted/50 px-1 text-[9px] font-semibold uppercase text-muted-foreground">{t('languageBeta')}</span>
        )}
        {active && <Check className="h-4 w-4 shrink-0" />}
      </button>
    );
  };

  const heading = (label: string) => (
    <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">{label}</p>
  );

  return (
    <div>
      {searchable && (
        <label className="relative mx-1.5 mb-1 block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('languageSearch')}
            aria-label={t('languageSearch')}
            className="h-9 w-full rounded-lg border border-border/60 bg-background/60 pl-8 pr-3 text-sm text-cream placeholder:text-muted-foreground/60 focus:border-accent/60 focus:outline-none"
          />
        </label>
      )}
      {rows.suggested.length > 0 && (
        <>
          {heading(t('languageSuggested'))}
          {rows.suggested.map(row)}
        </>
      )}
      {rows.rest.length > 0 && (
        <>
          {heading(t('languageAll'))}
          {rows.rest.map(row)}
        </>
      )}
      {rows.suggested.length === 0 && rows.rest.length === 0 && (
        <p className="px-3 py-4 text-center text-sm text-muted-foreground">{t('languageNoMatch')}</p>
      )}
    </div>
  );
}
