'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Bell, CheckCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { markAllNotificationsRead, setNotificationRead, type ResolvedNotification } from '@/lib/notifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { useNotifications } from '@/components/notifications/useNotifications';
import { cn } from '@/lib/utils';

const PREVIEW_COUNT = 5;
/** Below this width the panel spans the screen under the header */
const MOBILE_BREAKPOINT = 640;

export function NotificationBell() {
  const t = useTranslations('notifications');
  const locale = useLocale();
  const router = useRouter();
  const { items, unread, unavailable } = useNotifications(PREVIEW_COUNT);
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevUnread = useRef<number | null>(null);

  // Portal target only exists in the browser
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // A short ring when the unread count goes up (not on the first load)
  useEffect(() => {
    const prev = prevUnread.current;
    prevUnread.current = unread;
    if (prev === null || unread <= prev) return;
    const start = requestAnimationFrame(() => setRinging(true));
    const stop = setTimeout(() => setRinging(false), 1200);
    return () => {
      cancelAnimationFrame(start);
      clearTimeout(stop);
    };
  }, [unread]);

  // Position the panel under the bell (fixed, so the header's overflow can't clip it)
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const button = buttonRef.current;
    if (!open || !panel || !button) return;
    const place = () => {
      const rect = button.getBoundingClientRect();
      panel.style.top = `${rect.bottom + 8}px`;
      if (window.innerWidth < MOBILE_BREAKPOINT) {
        panel.style.left = '8px';
        panel.style.right = '8px';
      } else {
        // Right-aligned to the bell, but never past the left edge of the screen
        panel.style.right = 'auto';
        panel.style.left = `${Math.max(8, Math.min(rect.right, window.innerWidth - 8) - panel.offsetWidth)}px`;
      }
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (unavailable) return null;

  const openItem = async (item: ResolvedNotification) => {
    setOpen(false);
    if (!item.row.is_read) void setNotificationRead(createClient(), item.row, true);
    if (item.href && /^https?:/i.test(item.href)) window.open(item.href, '_blank', 'noopener');
    else router.push(item.href ?? `/${locale}/ertesitesek#n-${item.row.id}`);
  };

  const badge = unread > 9 ? '9+' : String(unread);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? t('bellLabelUnread', { count: unread }) : t('title')}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/30 text-muted-foreground transition-all hover:border-accent/30 hover:text-accent',
          open && 'border-accent/30 text-accent'
        )}
      >
        <Bell className={cn('h-4 w-4', ringing && 'animate-bell-ring motion-reduce:animate-none')} />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-accent-light to-accent-dark px-1 text-[10px] font-bold leading-none text-accent-foreground shadow-glow-gold">
            {badge}
          </span>
        )}
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={t('title')}
            className="fixed z-50 flex max-h-[min(32rem,calc(100dvh-6rem))] animate-pop-in flex-col overflow-hidden rounded-2xl border border-border/60 bg-card-elevated/95 shadow-card backdrop-blur-xl motion-reduce:animate-none sm:w-96"
          >
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
              <p className="font-display text-base font-semibold text-gradient-gold">{t('title')}</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllNotificationsRead(createClient())}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent transition hover:brightness-110"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t('markAllRead')}
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1 divide-y divide-border/30 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('empty')}</p>
              ) : (
                items.map((item) => <NotificationItem key={item.row.id} item={item} variant="compact" onOpen={() => void openItem(item)} />)
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(`/${locale}/ertesitesek`);
              }}
              className="border-t border-border/40 px-4 py-3 text-center text-sm font-medium text-accent transition hover:bg-muted/30"
            >
              {t('viewAll')} ▸
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
