import { toIntlLocale } from '@/i18n';

export function formatActivityDate(dateStr: string | null, locale: string): string | null {
  if (!dateStr) return null;
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr));
}