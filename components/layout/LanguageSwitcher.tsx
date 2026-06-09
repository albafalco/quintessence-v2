'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { locales } from '@/i18n';
import { LOCALE_META } from '@/lib/locale-meta';
import { FlagIcon } from '@/components/ui/FlagIcon';
import { cn } from '@/lib/utils';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/') || `/${newLocale}`);
  };

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-muted/30 p-0.5 sm:gap-1 sm:rounded-xl sm:p-1">
      {locales.map((loc) => {
        const active = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => switchLocale(loc)}
            className={cn(
              'flex items-center gap-1 rounded-md px-1 py-1 transition-all sm:gap-1.5 sm:rounded-lg sm:px-2.5 sm:py-1.5',
              active
                ? 'bg-primary/30 text-accent shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
            title={LOCALE_META[loc].label}
            aria-label={LOCALE_META[loc].label}
            aria-current={active ? 'true' : undefined}
          >
            <FlagIcon locale={loc} className="h-3 w-4 sm:h-3.5 sm:w-5" />
            <span className="hidden text-xs font-medium sm:inline">{loc.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}