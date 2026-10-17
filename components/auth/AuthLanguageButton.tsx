'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { LanguageBadge, LanguageList } from '@/components/layout/LanguagePicker';
import { useSwitchLocale } from '@/components/layout/useSwitchLocale';
import type { Locale } from '@/i18n';
import { cn } from '@/lib/utils';

/** Login / register pages: language picker in the top right corner (no account yet). */
export function AuthLanguageButton() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const switchLocale = useSwitchLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (code: Locale) => {
    setOpen(false);
    if (code !== locale) void switchLocale(code);
  };

  return (
    <div ref={rootRef} className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('language')}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1.5 rounded-xl border border-border/50 bg-card/60 px-2 py-1.5 backdrop-blur transition hover:border-accent/30',
          open && 'border-accent/30'
        )}
      >
        <LanguageBadge code={locale} className="border-0 bg-transparent px-0" />
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={t('language')}
          className="absolute right-0 top-full mt-2 max-h-[min(22rem,70dvh)] w-64 animate-pop-in overflow-y-auto rounded-2xl border border-border/60 bg-card-elevated/95 p-1.5 shadow-card backdrop-blur-xl motion-reduce:animate-none"
        >
          <LanguageList onPick={pick} itemRole="menuitemradio" />
        </div>
      )}
    </div>
  );
}
