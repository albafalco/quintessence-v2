import { fallbackLocale, toIntlLocale, type Locale } from '@/i18n';
import flagHu from 'flag-icons/flags/4x3/hu.svg';
import flagGb from 'flag-icons/flags/4x3/gb.svg';
import flagDe from 'flag-icons/flags/4x3/de.svg';
import flagIt from 'flag-icons/flags/4x3/it.svg';
import flagBr from 'flag-icons/flags/4x3/br.svg';
import flagRo from 'flag-icons/flags/4x3/ro.svg';
import flagSk from 'flag-icons/flags/4x3/sk.svg';

// Spain and Serbia: the plain civil flag (public/flags) — the full coats of arms
// weigh 80–180 KB for a 16 px badge
const flagEs = { src: '/flags/es.svg' };
const flagRs = { src: '/flags/rs.svg' };

/**
 * The one list of UI languages. Adding a language: add its code to `locales`
 * in i18n.ts (TypeScript then asks for the entry here) and a messages file.
 */
export interface LanguageInfo {
  code: Locale;
  /** Name in the language itself (endonym) */
  nativeName: string;
  /** Flag shown next to the code; null where no single country fits (a globe is shown) */
  flag: { src: string } | null;
  dir: 'ltr' | 'rtl';
  /** beta: partly translated, missing texts fall back to English */
  status: 'ready' | 'beta';
}

export const LANGUAGES: Record<Locale, LanguageInfo> = {
  hu: { code: 'hu', nativeName: 'Magyar', flag: flagHu, dir: 'ltr', status: 'ready' },
  en: { code: 'en', nativeName: 'English', flag: flagGb, dir: 'ltr', status: 'ready' },
  de: { code: 'de', nativeName: 'Deutsch', flag: flagDe, dir: 'ltr', status: 'ready' },
  es: { code: 'es', nativeName: 'Español', flag: flagEs, dir: 'ltr', status: 'ready' },
  it: { code: 'it', nativeName: 'Italiano', flag: flagIt, dir: 'ltr', status: 'ready' },
  // Brazilian Portuguese
  pt: { code: 'pt', nativeName: 'Português', flag: flagBr, dir: 'ltr', status: 'ready' },
  ro: { code: 'ro', nativeName: 'Română', flag: flagRo, dir: 'ltr', status: 'ready' },
  sk: { code: 'sk', nativeName: 'Slovenčina', flag: flagSk, dir: 'ltr', status: 'ready' },
  // Serbian in Latin script
  sr: { code: 'sr', nativeName: 'Srpski', flag: flagRs, dir: 'ltr', status: 'ready' },
};

/** Missing translations are taken from this language (set in i18n.ts). */
export const FALLBACK_LOCALE: Locale = fallbackLocale;

/** The search field appears above this many languages. */
export const LANGUAGE_SEARCH_THRESHOLD = 8;

export function getLanguage(code: string): LanguageInfo | undefined {
  return (LANGUAGES as Record<string, LanguageInfo>)[code];
}

/** Language name in the UI language ("német" on the Hungarian UI); null if the browser can't tell. */
export function localizedLanguageName(code: string, uiLocale: string): string | null {
  try {
    return new Intl.DisplayNames([toIntlLocale(uiLocale)], { type: 'language' }).of(code) ?? null;
  } catch {
    return null;
  }
}

/** Supported locales matching the browser languages ("de-AT" → de), best first, without duplicates. */
export function matchLocales(preferred: readonly string[]): Locale[] {
  const result: Locale[] = [];
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    const language = getLanguage(base);
    if (language && !result.includes(language.code)) result.push(language.code);
  }
  return result;
}
