'use client';

import { useTranslations } from 'next-intl';
import type { ReadingPage } from '@/lib/i18n-content';
import { Prose } from './Prose';

interface UtravaloViewProps {
  page: ReadingPage;
  source: string;
  onDone: () => void;
  /** Button label; defaults to "Elolvastam" */
  doneLabel?: string;
}

/** A short reading from the book before a new practice ("Útravaló"). */
export function UtravaloView({ page, source, onDone, doneLabel }: UtravaloViewProps) {
  const t = useTranslations('feherMagia.utravalo');
  return (
    <article className="flex flex-1 flex-col gap-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">{t('label')}</p>
      <h2 className="font-display text-2xl font-semibold text-gradient-gold">{page.title}</h2>
      <Prose paragraphs={page.paragraphs} />
      {page.page && (
        <p className="text-right text-xs italic text-muted-foreground">{t('source', { source, page: page.page })}</p>
      )}
      <button
        type="button"
        onClick={onDone}
        className="mt-auto rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/30"
      >
        {doneLabel ?? t('read')}
      </button>
    </article>
  );
}
