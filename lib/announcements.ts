import { locales, type Locale } from '@/i18n';
export type AnnouncementKind = 'news' | 'content' | 'system';
export type AnnouncementAudience = 'all' | 'hu';
export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'expired';

/** Every UI language besides Hungarian (the announcement's base text) */
export type TranslationLocale = Exclude<Locale, 'hu'>;
export const TRANSLATION_LOCALES = locales.filter((l): l is TranslationLocale => l !== 'hu');
export type AnnouncementTranslations = Partial<Record<TranslationLocale, { title?: string; body?: string; link_label?: string }>>;

export interface AnnouncementRow {
  id: string;
  kind: AnnouncementKind;
  title: string;
  body: string;
  translations: AnnouncementTranslations;
  link_url: string | null;
  link_label: string | null;
  audience: AnnouncementAudience;
  publish_at: string | null;
  expires_at: string | null;
  send_push: boolean;
  push_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export const ANNOUNCEMENT_LIMITS = { title: 120, body: 2000, linkLabel: 40 };

export function announcementStatus(a: Pick<AnnouncementRow, 'publish_at' | 'expires_at'>, now = Date.now()): AnnouncementStatus {
  if (!a.publish_at) return 'draft';
  if (new Date(a.publish_at).getTime() > now) return 'scheduled';
  if (a.expires_at && new Date(a.expires_at).getTime() <= now) return 'expired';
  return 'published';
}

/** In-app path ("/modules/magia/ma") or an https link; anything else is rejected. */
export function isValidAnnouncementLink(url: string) {
  return /^\/[^\s]*$/.test(url) || /^https:\/\/[^\s]+$/i.test(url);
}
