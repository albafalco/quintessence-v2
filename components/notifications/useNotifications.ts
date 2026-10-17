'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useAngolAccess } from '@/components/layout/ModuleAccessProvider';
import { NOTIFICATIONS_CHANGED_EVENT, resolveNotification, type FeedRow, type ResolvedNotification } from '@/lib/notifications';

/** Background re-check while the app is visible (scheduled announcements have no other trigger). */
const POLL_INTERVAL_MS = 60_000;

interface NotificationsState {
  items: ResolvedNotification[];
  unread: number;
  /** false until the first load finished */
  loaded: boolean;
  /** true when the tables are missing (migration 013 not run yet) */
  unavailable: boolean;
  reload: () => void;
}

async function fetchFeed(limit: number) {
  const supabase = createClient();
  const [feed, count] = await Promise.all([
    supabase.rpc('notifications_feed', { p_limit: limit }),
    supabase.rpc('notifications_unread_count'),
  ]);
  return {
    rows: (feed.data ?? []) as FeedRow[],
    unread: typeof count.data === 'number' ? count.data : 0,
    unavailable: Boolean(feed.error && count.error),
  };
}

/**
 * Feed + unread count. Re-fetches on page navigation, every minute while the
 * app is visible, when it regains focus, when a push arrives (service worker
 * message) and when something marks notifications.
 */
export function useNotifications(limit: number): NotificationsState {
  const locale = useLocale();
  const tNotifications = useTranslations('notifications');
  const tBadges = useTranslations('badges');
  const tMagia = useTranslations('magia');
  const pathname = usePathname();
  const angol = useAngolAccess() === true;
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const reload = useCallback(() => {
    fetchFeed(limit)
      .then((r) => {
        setRows(r.rows);
        setUnread(r.unread);
        setUnavailable(r.unavailable);
      })
      .catch(() => setUnavailable(true))
      .finally(() => setLoaded(true));
  }, [limit]);

  useEffect(() => {
    let cancelled = false;
    fetchFeed(limit)
      .then((r) => {
        if (cancelled) return;
        setRows(r.rows);
        setUnread(r.unread);
        setUnavailable(r.unavailable);
      })
      .catch(() => !cancelled && setUnavailable(true))
      .finally(() => !cancelled && setLoaded(true));

    const onVisible = () => document.visibilityState === 'visible' && reload();
    const onSwMessage = (e: MessageEvent) => e.data?.type === 'PUSH_RECEIVED' && reload();
    const poll = setInterval(() => document.visibilityState === 'visible' && reload(), POLL_INTERVAL_MS);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, reload);
    document.addEventListener('visibilitychange', onVisible);
    navigator.serviceWorker?.addEventListener('message', onSwMessage);
    return () => {
      cancelled = true;
      clearInterval(poll);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, reload);
      document.removeEventListener('visibilitychange', onVisible);
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
    };
  }, [limit, reload]);

  // The bell lives in the persistent header: re-check on every page change
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    reload();
  }, [pathname, reload]);

  const items = useMemo(
    () =>
      rows
        .map((row) =>
          resolveNotification(row, locale, {
            notifications: tNotifications as never,
            badges: tBadges as never,
            magia: tMagia as never,
          }, angol)
        )
        .filter((n): n is ResolvedNotification => n !== null),
    [rows, locale, tNotifications, tBadges, tMagia, angol]
  );

  // Hidden (locked-module) rows must not count as unread either
  const hiddenUnread = rows.filter((r) => !r.is_read).length - items.filter((i) => !i.row.is_read).length;

  return { items, unread: Math.max(0, unread - hiddenUnread), loaded, unavailable, reload };
}
