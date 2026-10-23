import { defaultLocale, fallbackLocale, locales, type Locale } from '@/i18n';
import { mergeMessages } from '@/lib/merge-messages';

type Messages = Record<string, unknown>;

const cache = new Map<Locale, Messages>();

export async function loadMessages(locale: Locale): Promise<Messages> {
  if (cache.has(locale)) return cache.get(locale)!;

  const mod = await import(`@/messages/${locale}.json`);
  // Missing texts fall back to English, and a text not translated yet to the
  // Hungarian source (same order as the UI, see i18n.ts)
  let messages: Messages;
  if (locale === defaultLocale) messages = mod.default as Messages;
  else if (locale === fallbackLocale) messages = mergeMessages(await loadMessages(defaultLocale), mod.default as Messages);
  else messages = mergeMessages(await loadMessages(fallbackLocale), mod.default as Messages);
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
  if (value && (locales as readonly string[]).includes(value)) return value as Locale;
  return 'hu';
}