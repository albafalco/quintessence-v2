import type { Locale } from '@/i18n';

export const DEFAULT_ANGOL_PUSH_TIME = '20:00';
export const DEFAULT_MAGIA_PUSH_TIME = '08:00';
export const DEFAULT_MAGIA_EVENING_PUSH_TIME = '19:00';
export const DEFAULT_MAGIA_STREAK_PUSH_TIME = '20:30';

/** Language names in their own language (endonyms), same on every UI locale. */
export const NATIVE_LOCALE_LABELS: Record<Locale, string> = {
  hu: 'Magyar',
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
};

export function getNativeLocaleLabel(locale: Locale): string {
  return NATIVE_LOCALE_LABELS[locale];
}