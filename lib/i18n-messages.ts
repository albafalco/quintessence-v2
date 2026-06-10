import type { Locale } from '@/i18n';

type Messages = Record<string, unknown>;

const cache = new Map<Locale, Messages>();

export async function loadMessages(locale: Locale): Promise<Messages> {
  if (cache.has(locale)) return cache.get(locale)!;

  const mod = await import(`@/messages/${locale}.json`);
  const messages = mod.default as Messages;
  cache.set(locale, messages);
  return messages;
}

export async function getMessage(
  locale: Locale,
  key: string,
  values?: Record<string, string | number>
): Promise<string> {
  const messages = await loadMessages(locale);
  const parts = key.split('.');
  let current: unknown = messages;

  for (const part of parts) {
    if (!current || typeof current !== 'object') return key;
    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current !== 'string') return key;

  if (!values) return current;

  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    current
  );
}

export function resolveLocale(value: string | null | undefined): Locale {
  const locales = ['hu', 'en', 'de', 'es', 'it'] as const;
  if (value && locales.includes(value as Locale)) return value as Locale;
  return 'hu';
}