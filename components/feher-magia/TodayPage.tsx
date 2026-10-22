import { getTranslations } from 'next-intl/server';
import { loadFeherMagia } from '@/lib/i18n-content';
import type { TodayData } from '@/lib/magia/store';
import { ROMAN_NUMERALS } from '@/lib/magia-utils';
import type { Locale } from '@/i18n';
import { MagiaTabs } from './MagiaTabs';
import { TodayView } from './TodayView';

/** The new "Ma" tab (admin preview until the switch). */
export async function TodayPage({ locale, userId, data }: { locale: string; userId: string; data: TodayData }) {
  const [t, tNav, content] = await Promise.all([
    getTranslations('feherMagia.header'),
    getTranslations('nav'),
    loadFeherMagia(locale as Locale),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="premium-card magia-surface p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">
          {t('fokozat', { roman: ROMAN_NUMERALS[data.path.fokozat] })} · {t('day', { day: data.completedEvenings + 1 })}
        </p>
        <h1 className="font-display text-3xl font-bold text-gradient-gold">{tNav('magia')}</h1>
        {data.path.wish && (
          <p className="mt-2 inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">
            {t('wish', { wish: data.path.wish })}
          </p>
        )}
      </header>
      <MagiaTabs locale={locale} active="ma" />
      <TodayView
        userId={userId}
        data={data}
        content={{ utravalo: content.utravalo, thought: content.thought, wishes: content.wishes, body: content.body, source: content.source }}
      />
    </div>
  );
}
