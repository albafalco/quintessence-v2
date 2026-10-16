'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { NOTIFICATIONS_CHANGED_EVENT, resolveNotification, type FeedRow, type ResolvedNotification } from '@/lib/notifications';

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

/** Feed + unread count; re-fetches when the app regains focus or something marks notifications. */
export function useNotifications(limit: number): NotificationsState {
  const locale = useLocale();
  const tNotifications = useTranslations('notifications');
  const tBadges = useTranslations('badges');
  const tMagia = useTranslations('magia');
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
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, reload);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, reload);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [limit, reload]);

  const items = useMemo(
    () =>
      rows
        .map((row) =>
          resolveNotification(row, locale, {
            notifications: tNotifications as never,
            badges: tBadges as never,
            magia: tMagia as never,
          })
        )
        .filter((n): n is ResolvedNotification => n !== null),
    [rows, locale, tNotifications, tBadges, tMagia]
  );

  return { items, unread, loaded, unavailable, reload };
}
