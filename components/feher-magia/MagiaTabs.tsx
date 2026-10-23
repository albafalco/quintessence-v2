import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

type Tab = 'ma' | 'tukor' | 'utam';

/** Ma · Tükör · Utam. Utam comes in the next step of the build. */
export async function MagiaTabs({ locale, active }: { locale: string; active: Tab }) {
  const t = await getTranslations('feherMagia.tabs');
  const tabs: { id: Tab; href: string | null }[] = [
    { id: 'ma', href: `/${locale}/modules/magia/ma` },
    { id: 'tukor', href: `/${locale}/modules/magia/tukor` },
    { id: 'utam', href: null },
  ];
  return (
    <nav className="flex gap-1 rounded-2xl border border-border/40 bg-card/30 p-1" aria-label="Fehér Mágia">
      {tabs.map((tab) =>
        tab.href ? (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active === tab.id ? 'page' : undefined}
            className={cn(
              'flex-1 rounded-xl px-3 py-2 text-center text-sm font-semibold transition',
              active === tab.id ? 'bg-accent/15 text-accent shadow-glow-gold' : 'text-muted-foreground hover:text-cream'
            )}
          >
            {t(tab.id)}
          </Link>
        ) : (
          <span
            key={tab.id}
            aria-disabled="true"
            className="flex flex-1 flex-col items-center rounded-xl px-3 py-1.5 text-center text-sm font-semibold text-muted-foreground/50"
          >
            {t(tab.id)}
            <span className="text-[9px] font-normal uppercase tracking-wider">{t('soon')}</span>
          </span>
        )
      )}
    </nav>
  );
}
