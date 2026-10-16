'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Bell, ChevronDown, ShieldCheck, User } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { InlineLanguageMenu } from './LanguageMenu';
import { cn } from '@/lib/utils';

interface UserMenuProps {
  username: string;
  name: string;
  isAdmin: boolean;
}

/** Header account button: "Üdv, @username" opening Profil / Értesítések / Admin / (mobile) Nyelv / Kijelentkezés. */
export function UserMenu({ username, name, isAdmin }: UserMenuProps) {
  const t = useTranslations('nav');
  const tNotifications = useTranslations('notifications');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
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
    panel.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const items = [...(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
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
  }, [open]);

  const close = () => setOpen(false);
  const itemClass =
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-cream/90 transition hover:bg-muted/40 hover:text-cream focus-visible:bg-muted/40 focus-visible:outline-none';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
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
            aria-label={t('userMenu')}
            className="fixed z-50 w-60 animate-pop-in overflow-hidden rounded-2xl border border-border/60 bg-card-elevated/95 shadow-card backdrop-blur-xl motion-reduce:animate-none"
          >
            <div className="border-b border-border/40 px-4 py-3">
              {name && <p className="truncate text-sm font-semibold text-cream">{name}</p>}
              <p className="truncate text-xs text-muted-foreground">@{username}</p>
            </div>
            <div className="p-1.5">
              <Link role="menuitem" href={`/${locale}/profile`} onClick={close} className={itemClass}>
                <User className="h-4 w-4 shrink-0 text-accent" />
                {t('profile')}
              </Link>
              <Link role="menuitem" href={`/${locale}/ertesitesek`} onClick={close} className={itemClass}>
                <Bell className="h-4 w-4 shrink-0 text-accent" />
                {tNotifications('title')}
              </Link>
              {isAdmin && (
                // The admin area is Hungarian-only
                <Link role="menuitem" href="/hu/admin" onClick={close} className={itemClass}>
                  <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
                  {t('admin')}
                </Link>
              )}
              {/* Desktop/tablet: the language lives in the sidebar */}
              <div className="md:hidden">
                <InlineLanguageMenu itemClassName={itemClass} onPicked={close} />
              </div>
            </div>
            <div className="border-t border-border/40 p-1.5">
              <LogoutButton variant="nav" role="menuitem" className="rounded-lg px-3 py-2 [&>svg]:h-4 [&>svg]:w-4" />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
