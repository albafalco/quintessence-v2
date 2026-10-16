import type { Locale } from '@/i18n';

/**
 * Texts for the screens shown when the app itself failed to start or crashed
 * (BootFallback, GlobalErrorBoundary). They render outside next-intl's
 * provider, so they cannot use the regular message files.
 */
const BOOT_TEXTS: Record<Locale, { notStarted: string; errorTitle: string; errorUnknown: string; reload: string }> = {
  hu: {
    notStarted: 'Az alkalmazás nem indult el. Próbáld újra.',
    errorTitle: 'Valami hiba történt',
    errorUnknown: 'Ismeretlen hiba az alkalmazás betöltésekor.',
    reload: 'Újratöltés',
  },
  en: {
    notStarted: 'The app did not start. Please try again.',
    errorTitle: 'Something went wrong',
    errorUnknown: 'Unknown error while loading the app.',
    reload: 'Reload',
  },
  de: {
    notStarted: 'Die App wurde nicht gestartet. Bitte versuche es erneut.',
    errorTitle: 'Etwas ist schiefgelaufen',
    errorUnknown: 'Unbekannter Fehler beim Laden der App.',
    reload: 'Neu laden',
  },
  es: {
    notStarted: 'La aplicación no se inició. Inténtalo de nuevo.',
    errorTitle: 'Algo salió mal',
    errorUnknown: 'Error desconocido al cargar la aplicación.',
    reload: 'Recargar',
  },
  it: {
    notStarted: "L'app non si è avviata. Riprova.",
    errorTitle: 'Qualcosa è andato storto',
    errorUnknown: "Errore sconosciuto durante il caricamento dell'app.",
    reload: 'Ricarica',
  },
};

export function getBootTexts(locale: string) {
  return BOOT_TEXTS[(locale in BOOT_TEXTS ? locale : 'hu') as Locale];
}
