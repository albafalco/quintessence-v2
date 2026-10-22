'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown, ChevronLeft, ChevronRight, Languages, Palette, Settings, ShieldCheck, User } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { LanguageBadge, LanguageList } from './LanguagePicker';
import { ThemeList, ThemeSwatch, useThemeName } from './ThemePicker';
import { useTheme } from './ThemeProvider';
import { useSwitchLocale } from './useSwitchLocale';
import { getLanguage } from '@/lib/languages';
import type { Locale } from '@/i18n';
import { cn } from '@/lib/utils';

interface UserMenuProps {
  username: string;
  name: string;
  isAdmin: boolean;
}

type View = 'main' | 'language' | 'theme';

const ITEM_SELECTOR = '[role="menuitem"], [role="menuitemradio"], input';

/**
 * Header account button: "Üdv, @username" opening Profil / Beállítások / Admin /
 * Nyelv / Megjelenés / Kijelentkezés. "Nyelv" switches the panel to the language list.
 */
export function UserMenu({ username, name, isAdmin }: UserMenuProps) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const switchLocale = useSwitchLocale();
  const { preference: theme } = useTheme();
  const themeName = useThemeName();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('main');
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Portal target only exists in the browser
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Right-aligned under the button (fixed, so the header's overflow can't clip it)
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const button = buttonRef.current;
    if (!open || !panel || !button) return;
    const place = () => {
      const rect = button.getBoundingClientRect();
      panel.style.top = `${rect.bottom + 8}px`;
      panel.style.left = `${Math.max(8, Math.min(rect.right, window.innerWidth - 8) - panel.offsetWidth)}px`;
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, mounted]);

  // First item of the current view gets the focus (keyboard users land in the list)
  useLayoutEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus();
  }, [open, view, mounted]);

  const close = () => {
    setOpen(false);
    setView('main');
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
        setView('main');
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // In the language list Esc steps back first
        if (view === 'language') setView('main');
        else {
          setOpen(false);
          buttonRef.current?.focus();
        }
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const items = [...(panelRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [])];
      if (items.length === 0) return;
      e.preventDefault();
      const current = items.indexOf(document.activeElement as HTMLElement);
      const next = e.key === 'ArrowDown' ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
      items[next].focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, view]);

  const pickLanguage = (code: Locale) => {
    close();
    if (code !== locale) void switchLocale(code);
  };

  const itemClass =
    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-cream/90 transition hover:bg-muted/40 hover:text-cream focus-visible:bg-muted/40 focus-visible:outline-none';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={t('userMenu')}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex shrink-0 items-center gap-2 rounded-xl border border-border/50 bg-muted/30 p-1.5 sm:gap-2.5 sm:px-3 sm:py-1.5',
          'transition-all hover:border-accent/30 hover:bg-muted/50',
          open && 'border-accent/30 bg-muted/50'
        )}
      >
        <UserAvatar username={username} className="h-7 w-7 text-xs sm:h-8 sm:w-8" />
        <div className="hidden text-sm md:block">
          <span className="text-muted-foreground">{t('greeting')} </span>
          <span className="font-medium text-cream">@{username}</span>
        </div>
        <ChevronDown className={cn('hidden h-4 w-4 text-muted-foreground transition-transform duration-200 md:block', open && 'rotate-180')} />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label={view === 'language' ? t('language') : view === 'theme' ? t('appearance') : t('userMenu')}
            className="fixed z-50 w-64 animate-pop-in overflow-hidden rounded-2xl border border-border/60 bg-card-elevated/95 shadow-card backdrop-blur-xl motion-reduce:animate-none"
          >
            {view === 'main' ? (
              <div key="main" className="animate-fade-in motion-reduce:animate-none">
                <div className="border-b border-border/40 px-4 py-3">
                  {name && <p className="truncate text-sm font-semibold text-cream">{name}</p>}
                  <p className="truncate text-xs text-muted-foreground">@{username}</p>
                </div>
                <div className="p-1.5">
                  <Link role="menuitem" href={`/${locale}/profile`} onClick={close} className={itemClass}>
                    <User className="h-4 w-4 shrink-0 text-accent" />
                    {t('profile')}
                  </Link>
                  <Link role="menuitem" href={`/${locale}/beallitasok`} onClick={close} className={itemClass}>
                    <Settings className="h-4 w-4 shrink-0 text-accent" />
                    {t('settings')}
                  </Link>
                  {isAdmin && (
                    // The admin area is Hungarian-only
                    <Link role="menuitem" href="/hu/admin" onClick={close} className={itemClass}>
                      <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
                      {t('admin')}
                    </Link>
                  )}
                  <button type="button" role="menuitem" aria-haspopup="menu" onClick={() => setView('language')} className={itemClass}>
                    <Languages className="h-4 w-4 shrink-0 text-accent" />
                    <span className="flex-1">{t('language')}</span>
                    <LanguageBadge code={locale} />
                    <span className="sr-only">{getLanguage(locale)?.nativeName}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                  <button type="button" role="menuitem" aria-haspopup="menu" onClick={() => setView('theme')} className={itemClass}>
                    <Palette className="h-4 w-4 shrink-0 text-accent" />
                    <span className="flex-1">{t('appearance')}</span>
                    <ThemeSwatch theme={theme} className="h-5 w-7" />
                    <span className="sr-only">{themeName(theme)}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </div>
                <div className="border-t border-border/40 p-1.5">
                  <LogoutButton variant="nav" role="menuitem" className="rounded-lg px-3 py-2 [&>svg]:h-4 [&>svg]:w-4" />
                </div>
              </div>
            ) : view === 'theme' ? (
              <div key="theme" className="animate-fade-in motion-reduce:animate-none">
                <div className="flex items-center gap-1 border-b border-border/40 px-1.5 py-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setView('main')}
                    aria-label={t('languageBack')}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted/40 hover:text-cream focus-visible:bg-muted/40 focus-visible:outline-none"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <p className="font-display text-sm font-semibold text-gradient-gold">{t('appearance')}</p>
                </div>
                <div className="p-1.5">
                  <ThemeList />
                </div>
              </div>
            ) : (
              <div key="language" className="animate-fade-in motion-reduce:animate-none">
                <div className="flex items-center gap-1 border-b border-border/40 px-1.5 py-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setView('main')}
                    aria-label={t('languageBack')}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted/40 hover:text-cream focus-visible:bg-muted/40 focus-visible:outline-none"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <p className="font-display text-sm font-semibold text-gradient-gold">{t('language')}</p>
                </div>
                <div className="max-h-[min(22rem,60dvh)] overflow-y-auto p-1.5">
                  <LanguageList onPick={pickLanguage} itemRole="menuitemradio" />
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
