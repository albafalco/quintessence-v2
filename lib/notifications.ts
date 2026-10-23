import type { SupabaseClient } from '@supabase/supabase-js';
import { BADGES } from '@/lib/badges';
import { locales, toIntlLocale } from '@/i18n';
import { formatFullName } from '@/lib/person-name';

/** One row of notifications_feed() (migration 013). */
export interface FeedRow {
  id: string;
  source: 'announcement' | 'personal';
  kind: string;
  title: string | null;
  body: string | null;
  translations: Record<string, { title?: string; body?: string; link_label?: string }> | null;
  link_url: string | null;
  link_label: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  expires_at: string | null;
  is_read: boolean;
}

export type NotificationCategory = 'news' | 'content' | 'system' | 'personal';

export interface ResolvedNotification {
  row: FeedRow;
  category: NotificationCategory;
  /** AppIcon name */
  icon: string;
  title: string;
  body: string;
  href: string | null;
  linkLabel: string | null;
  /** Announcement past its expiry (kept in the archive) */
  expired: boolean;
}

/** Fired after anything that may change the unread count (bell + page re-fetch). */
export const NOTIFICATIONS_CHANGED_EVENT = 'quintessence:notifications-changed';

/** Asks an open notifications page to show (expand + highlight) one item; detail = id. */
export const NOTIFICATION_FOCUS_EVENT = 'quintessence:notification-focus';

export function emitNotificationsChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

/** AppIcon names */
const ANNOUNCEMENT_ICONS: Record<string, string> = { news: 'sparkles', content: 'book', system: 'alert' };

type Translator = (key: string, values?: Record<string, string | number>) => string;

/** In-app paths are written without locale ("/modules/angol"); external links stay as they are. */
export function localizeHref(url: string | null, locale: string): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith('/')) return null;
  if ((locales as readonly string[]).includes(url.split('/')[1] ?? '')) return url;
  return `/${locale}${url}`;
}

export function resolveNotification(
  row: FeedRow,
  locale: string,
  t: { notifications: Translator; badges: Translator },
  /** Kreatív Angol unlocked for this user; its personal notifications are hidden otherwise */
  angol: boolean,
  now = Date.now()
): ResolvedNotification | null {
  if (row.source === 'announcement') {
    const tr = row.translations?.[locale];
    return {
      row,
      category: (['news', 'content', 'system'].includes(row.kind) ? row.kind : 'news') as NotificationCategory,
      icon: ANNOUNCEMENT_ICONS[row.kind] ?? 'sparkles',
      title: tr?.title || row.title || '',
      body: tr?.body || row.body || '',
      href: localizeHref(row.link_url, locale),
      linkLabel: tr?.link_label || row.link_label || null,
      expired: Boolean(row.expires_at && new Date(row.expires_at).getTime() <= now),
    };
  }

  const data = row.data ?? {};
  const personal = (icon: string, title: string, body: string, href: string | null) => ({
    row,
    category: 'personal' as const,
    icon,
    title,
    body,
    href,
    linkLabel: null,
    expired: false,
  });

  switch (row.kind) {
    case 'badge': {
      const badge = BADGES.find((b) => b.id === data.badge_id);
      // Retired milestones (e.g. the Kreatív Angol ones) are not shown
      if (!badge) return null;
      return personal(
        badge.icon,
        t.notifications('badgeTitle', { title: t.badges(`${badge.id}.title`) }),
        t.badges(`${badge.id}.desc`),
        `/${locale}/profile`
      );
    }
    case 'invite_granted':
      return personal('ticket', t.notifications('inviteTitle', { count: Number(data.amount ?? 1) }), t.notifications('inviteBody'), `/${locale}/profile`);
    case 'invite_accepted':
      return personal('party', t.notifications('inviteAcceptedTitle', { username: String(data.username ?? '—') }), t.notifications('inviteAcceptedBody'), `/${locale}/profile`);
    case 'invite_returned':
      return personal(
        'ticket',
        t.notifications('inviteReturnedTitle'),
        t.notifications(data.reason === 'revoked' ? 'inviteRevokedBody' : 'inviteExpiredBody', { email: String(data.email ?? '') }),
        `/${locale}/profile`
      );
    case 'module_granted':
      if (data.module !== 'angol' || !angol) return null;
      return personal('graduation', t.notifications('moduleGrantedTitle'), t.notifications('moduleGrantedBody'), `/${locale}/modules/angol`);
    case 'name_change_requested':
      // Sent to admins; the admin area is Hungarian-only
      return personal(
        'pen',
        t.notifications('nameRequestTitle', { username: String(data.username ?? '—') }),
        t.notifications('nameRequestBody', { name: formatFullName(String(data.first_name ?? ''), String(data.last_name ?? ''), locale) }),
        '/hu/admin/felhasznalok'
      );
    case 'name_change_approved':
      return personal(
        'check',
        t.notifications('nameApprovedTitle'),
        t.notifications('nameApprovedBody', { name: formatFullName(String(data.first_name ?? ''), String(data.last_name ?? ''), locale) }),
        `/${locale}/beallitasok#fiok`
      );
    case 'name_change_rejected':
      return personal('cross', t.notifications('nameRejectedTitle'), t.notifications('nameRejectedBody'), `/${locale}/beallitasok#fiok`);
    default:
      return null;
  }
}

export async function setNotificationRead(supabase: SupabaseClient, row: FeedRow, read: boolean) {
  if (row.source === 'announcement') {
    if (read) {
      await supabase.from('announcement_reads').upsert({ announcement_id: row.id }, { onConflict: 'user_id,announcement_id', ignoreDuplicates: true });
    } else {
      await supabase.from('announcement_reads').delete().eq('announcement_id', row.id);
    }
  } else {
    await supabase.from('user_notifications').update({ read_at: read ? new Date().toISOString() : null }).eq('id', row.id);
  }
  emitNotificationsChanged();
}

export async function markAllNotificationsRead(supabase: SupabaseClient) {
  await supabase.rpc('mark_all_notifications_read');
  emitNotificationsChanged();
}

/** Plain-text version of a formatted text (bell preview, push body). */
export function stripRichText(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1').replace(/\s+/g, ' ').trim();
}

/** "2 órája", "tegnap", … in the given locale. */
export function relativeTime(iso: string, locale: string, now = Date.now()) {
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(toIntlLocale(locale), { numeric: 'auto' });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 7 * 86_400) return rtf.format(Math.round(diffSec / 86_400), 'day');
  return new Intl.DateTimeFormat(toIntlLocale(locale), { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso));
}
