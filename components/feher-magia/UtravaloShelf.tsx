'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReadingPage } from '@/lib/i18n-content';
import { AppIcon } from '@/components/ui/AppIcon';
import { FlowShell } from './FlowShell';
import { UtravaloView } from './UtravaloView';

export interface ShelfItem {
  key: string;
  page: ReadingPage;
  /** Why it is not open yet ("a 8. naptól"); open when missing */
  lockedHint?: string;
}

const row = 'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm';

/** The Útravalók on the Utam tab: the Gate first, then the readings opened so far. */
export function UtravaloShelf({ locale, items, source }: { locale: string; items: ShelfItem[]; source: string }) {
  const t = useTranslations('feherMagia');
  const [reading, setReading] = useState<ReadingPage | null>(null);

  return (
    <>
      <ul className="space-y-2">
        <li>
          <Link href={`/${locale}/modules/magia/kapu`} className={`${row} border-accent/30 transition hover:bg-accent/10`}>
            <AppIcon name="book" className="h-4 w-4 shrink-0 text-accent" />
            <span className="flex-1 text-cream">{t('utam.gateItem')}</span>
            <span className="text-xs text-muted-foreground">{t('utam.gateItemSub')}</span>
          </Link>
        </li>
        {items.map((item) =>
          item.lockedHint ? (
            <li key={item.key} className={`${row} border-dashed border-border/40 text-muted-foreground`}>
              <AppIcon name="lock" className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.page.title}</span>
              <span className="text-xs">{item.lockedHint}</span>
            </li>
          ) : (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => setReading(item.page)}
                className={`${row} border-border/50 transition hover:border-accent/30 hover:bg-accent/5`}
              >
                <AppIcon name="book" className="h-4 w-4 shrink-0 text-accent/80" />
                <span className="flex-1 text-cream">{item.page.title}</span>
              </button>
            </li>
          )
        )}
      </ul>
      {reading && (
        <FlowShell title={t('tabs.utam')} onClose={() => setReading(null)}>
          <UtravaloView page={reading} source={source} onDone={() => setReading(null)} doneLabel={t('utravalo.close')} />
        </FlowShell>
      )}
    </>
  );
}
