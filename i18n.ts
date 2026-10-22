import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { mergeMessages } from './lib/merge-messages';

export const locales = ['hu', 'en', 'de', 'es', 'it', 'pt', 'ro', 'sk', 'sr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'hu';
/** Missing translations come from this language */
export const fallbackLocale: Locale = 'en';

/** Dates, numbers and names are formatted with these (pt = Brazilian, sr = Latin script). */
const INTL_LOCALES: Partial<Record<Locale, string>> = { pt: 'pt-BR', sr: 'sr-Latn' };

export function toIntlLocale(locale: string): string {
  return INTL_LOCALES[locale as Locale] ?? locale;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  if (!locale || !locales.includes(locale as Locale)) notFound();

  // Hungarian is the source language: a text not translated yet (neither in
  // this language nor in the fallback) shows in Hungarian instead of a raw key.
  const source = (await import(`./messages/${defaultLocale}.json`)).default;
  if (locale === defaultLocale) return { locale, messages: source };
  const fallback = mergeMessages(source, (await import(`./messages/${fallbackLocale}.json`)).default);
  return {
    locale,
    messages:
      locale === fallbackLocale
        ? fallback
        : mergeMessages(fallback, (await import(`./messages/${locale}.json`)).default),
  };
});