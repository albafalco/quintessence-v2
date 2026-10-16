'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { markAllNotificationsRead, setNotificationRead, type NotificationCategory, type ResolvedNotification } from '@/lib/notifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { useNotifications } from '@/components/notifications/useNotifications';
import { cn } from '@/lib/utils';

const FEED_LIMIT = 300;
type Filter = 'all' | NotificationCategory;
type Group = 'today' | 'thisWeek' | 'earlier';

const FILTERS: { id: Filter; icon: string; key: string }[] = [
  { id: 'all', icon: '', key: 'filterAll' },
  { id: 'news', icon: '✦', key: 'kindNews' },
  { id: 'content', icon: '📖', key: 'kindContent' },
  { id: 'system', icon: '⚠', key: 'kindSystem' },
  { id: 'personal', icon: '🏅', key: 'kindPersonal' },
];

function groupOf(iso: string, todayStart: number): Group {
  const time = new Date(iso).getTime();
  if (time >= todayStart) return 'today';
  if (time >= todayStart - 6 * 86_400_000) return 'thisWeek';
  return 'earlier';
}

export function NotificationsCenter() {
  const t = useTranslations('notifications');
  const { items, unread, loaded, unavailable } = useNotifications(FEED_LIMIT);
  const [filter, setFilter] = useState<Filter>('all');
  const [todayStart, setTodayStart] = useState<number | null>(null);

  // Local midnight is only known in the browser; also scroll to a linked item (#n-<id>)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      setTodayStart(d.getTime());
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!loaded || !window.location.hash.startsWith('#n-')) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [loaded]);

  if (unavailable) return <p className="premium-card p-6 text-center text-sm text-muted-foreground">{t('empty')}</p>;

  const visible = items.filter((i) => filter === 'all' || i.category === filter);
  const groups: { id: Group; items: ResolvedNotification[] }[] = (['today', 'thisWeek', 'earlier'] as Group[])
    .map((g) => ({ id: g, items: todayStart === null ? [] : visible.filter((i) => groupOf(i.row.created_at, todayStart) === g) }))
    .filter((g) => g.items.length > 0);

  const toggleRead = (item: ResolvedNotification) => void setNotificationRead(createClient(), item.row, !item.row.is_read);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                filter === f.id ? 'border-accent/50 bg-accent/10 text-accent' : 'border-border/50 text-muted-foreground hover:text-cream'
              )}
            >
              {f.icon && <span className="mr-1">{f.icon}</span>}
              {t(f.key)}
            </button>
          ))}
        </div>
        {unread > 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void markAllNotificationsRead(createClient())}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent transition hover:brightness-110"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t('markAllRead')}
            </button>
          </div>
        )}
      </div>

      {!loaded || todayStart === null ? (
        <p className="py-8 text-center text-sm text-muted-foreground">…</p>
      ) : groups.length === 0 ? (
        <p className="premium-card p-8 text-center text-sm text-muted-foreground">{filter === 'all' ? t('empty') : t('emptyFilter')}</p>
      ) : (
        groups.map((g) => (
          <section key={g.id} className="space-y-2">
            <p className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">{t(g.id)}</p>
            <div key={filter} className="animate-fade-up space-y-2 motion-reduce:animate-none">
              {g.items.map((item) => (
                <NotificationItem
                  key={item.row.id}
                  item={item}
                  variant="full"
                  onOpen={() => !item.row.is_read && void setNotificationRead(createClient(), item.row, true)}
                  onToggleRead={() => toggleRead(item)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
