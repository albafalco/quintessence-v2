'use client';

import { useTranslations } from 'next-intl';

/** The note's custom event: the Gyakorlás tab (TodayView) opens the note on it */
export const NOTE_EVENT = 'feher-magia:note';

/** Desktop: "+ Észrevétel" in the module header (the floating "+" is for phones). */
export function NoteButton() {
  const t = useTranslations('feherMagia.dashboard');
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(NOTE_EVENT))}
      className="hidden shrink-0 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20 md:inline-flex"
    >
      {t('note')}
    </button>
  );
}
