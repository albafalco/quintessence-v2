'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import { Check, ChevronDown, ChevronUp, Languages } from 'lucide-react';
import { locales, type Locale } from '@/i18n';
import { getNativeLocaleLabel } from '@/lib/locale-meta';
import { FlagIcon } from '@/components/ui/FlagIcon';
import { Collapse } from '@/components/ui/collapse';
import { useSwitchLocale } from './useSwitchLocale';
import { cn } from '@/lib/utils';

function LocaleOptions({ current, onPick, itemRole }: { current: Locale; onPick: (l: Locale) => void; itemRole?: string }) {
  return (
    <>
      {locales.map((loc) => {
        const active = loc === current;
        return (
          <button
            key={loc}
            type="button"
            role={itemRole}
            aria-checked={itemRole ? active : undefined}
            aria-current={itemRole ? undefined : active || undefined}
            onClick={() => onPick(loc)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition focus-visible:bg-muted/40 focus-visible:outline-none',
              active ? 'text-accent' : 'text-cream/90 hover:bg-muted/40 hover:text-cream'
            )}
          >
            <FlagIcon locale={loc} className="h-3.5 w-5 shrink-0" />
            <span className="flex-1 text-left font-medium">{getNativeLocaleLabel(loc)}</span>
            {active && <Check className="h-4 w-4 shrink-0" />}
          </button>
        );
      })}
    </>
  );
}

/** Desktop sidebar: a row above "Kijelentkezés"; the list opens upwards (to the right when collapsed). */
export function SidebarLanguageMenu({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations('nav');
  const locale = useLocale() as Locale;
  const switchLocale = useSwitchLocale();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Portal target only exists in the browser
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const button = buttonRef.current;
    if (!open || !panel || !button) return;
    const rect = button.getBoundingClientRect();
    if (collapsed) {
      panel.style.left = `${rect.right + 8}px`;
      panel.style.top = `${Math.max(8, rect.bottom - panel.offsetHeight)}px`;
    } else {
      panel.style.left = `${rect.left}px`;
      panel.style.width = `${rect.width}px`;
      panel.style.top = `${Math.max(8, rect.top - panel.offsetHeight - 6)}px`;
    }
  }, [open, collapsed, mounted]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (loc: Locale) => {
    setOpen(false);
    if (loc !== locale) void switchLocale(loc);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('language')}: ${getNativeLocaleLabel(locale)}`}
        title={collapsed ? getNativeLocaleLabel(locale) : undefined}
        className={cn(
          'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/40 hover:text-cream',
          open && 'bg-muted/40 text-cream',
          collapsed && 'justify-center px-2'
        )}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <FlagIcon locale={locale} className="h-3.5 w-5" />
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{getNativeLocaleLabel(locale)}</span>
            <ChevronUp className={cn('h-4 w-4 shrink-0 transition-transform duration-200', !open && 'rotate-180')} />
          </>
        )}
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label={t('language')}
            className="fixed z-50 min-w-[11rem] animate-pop-in rounded-2xl border border-border/60 bg-card-elevated/95 p-1.5 shadow-card backdrop-blur-xl motion-reduce:animate-none"
          >
            <p className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">{t('language')}</p>
            <LocaleOptions current={locale} onPick={pick} itemRole="menuitemradio" />
          </div>,
          document.body
        )}
    </>
  );
}

/** Mobile account menu: a "Nyelv" row that expands the list in place. */
export function InlineLanguageMenu({ itemClassName, onPicked }: { itemClassName: string; onPicked: () => void }) {
  const t = useTranslations('nav');
  const locale = useLocale() as Locale;
  const switchLocale = useSwitchLocale();
  const [open, setOpen] = useState(false);

  const pick = (loc: Locale) => {
    onPicked();
    if (loc !== locale) void switchLocale(loc);
  };

  return (
    <div>
      <button type="button" role="menuitem" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={cn(itemClassName, 'w-full')}>
        <Languages className="h-4 w-4 shrink-0 text-accent" />
        <span className="flex-1 text-left">{t('language')}</span>
        <FlagIcon locale={locale} className="h-3 w-4 shrink-0" />
        <span className="text-xs text-muted-foreground">{getNativeLocaleLabel(locale)}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <Collapse open={open}>
        <div className="pb-1 pl-6">
          <LocaleOptions current={locale} onPick={pick} itemRole="menuitemradio" />
        </div>
      </Collapse>
    </div>
  );
}
