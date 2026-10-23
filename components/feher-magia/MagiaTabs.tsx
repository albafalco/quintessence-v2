import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

type Tab = 'ma' | 'tukor' | 'utam';

/** Ma · Tükör · Utam */
export async function MagiaTabs({ locale, active }: { locale: string; active: Tab }) {
  const t = await getTranslations('feherMagia.tabs');
  const tNav = await getTranslations('nav');
  const tabs: { id: Tab; href: string }[] = [
    { id: 'ma', href: `/${locale}/modules/magia/ma` },
    { id: 'tukor', href: `/${locale}/modules/magia/tukor` },
    { id: 'utam', href: `/${locale}/modules/magia` },
  ];
  return (
    <nav className="flex gap-1 rounded-2xl border border-border/40 bg-card/30 p-1" aria-label={tNav('magia')}>
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={active === tab.id ? 'page' : undefined}
          className={cn(
            // A longer name (e.g. "Specchio dell’anima") wraps on a phone; the others stay centred
            'flex min-h-9 flex-1 items-center justify-center rounded-xl px-2 py-1.5 text-center text-sm font-semibold leading-tight transition sm:px-3',
            active === tab.id ? 'bg-accent/15 text-accent' : 'text-muted-foreground hover:text-cream'
          )}
        >
          {t(tab.id)}
        </Link>
      ))}
    </nav>
  );
}
