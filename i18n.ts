import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { mergeMessages } from './lib/merge-messages';

export const locales = ['hu', 'en', 'de', 'es', 'it'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'hu';
/** Missing translations come from this language */
export const fallbackLocale: Locale = 'en';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  if (!locale || !locales.includes(locale as Locale)) notFound();

  return {
    locale,
    messages:
      locale === fallbackLocale
        ? (await import(`./messages/${locale}.json`)).default
        : mergeMessages(
            (await import(`./messages/${fallbackLocale}.json`)).default,
            (await import(`./messages/${locale}.json`)).default
          ),
  };
});