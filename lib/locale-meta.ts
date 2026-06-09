import { type Locale } from '@/i18n';

export const LOCALE_META: Record<Locale, { label: string }> = {
  hu: { label: 'Magyar' },
  en: { label: 'English' },
  de: { label: 'Deutsch' },
  es: { label: 'Español' },
  it: { label: 'Italiano' },
};

export const DEFAULT_ANGOL_PUSH_TIME = '20:00';
export const DEFAULT_MAGIA_PUSH_TIME = '08:00';
export const DEFAULT_MAGIA_EVENING_PUSH_TIME = '19:00';
export const DEFAULT_MAGIA_STREAK_PUSH_TIME = '20:30';