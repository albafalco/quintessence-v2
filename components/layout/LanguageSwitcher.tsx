'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { locales } from '@/i18n';
import { LOCALE_META } from '@/lib/locale-meta';
import { FlagIcon } from '@/components/ui/FlagIcon';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/') || `/${newLocale}`);
  };

  if (compact) {
    return (
      <select
        value={locale}
        onChange={(e) => switchLocale(e.target.value)}
        className="input-premium h-9 min-w-0 cursor-pointer appearance-none rounded-lg border-border/60 bg-muted/40 px-2 py-1 text-xs font-medium"
        aria-label="Language"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_META[loc].label} ({loc.toUpperCase()})
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
      {locales.map((loc) => {
        const active = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => switchLocale(loc)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
              active
                ? 'bg-primary/30 text-accent shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
            title={LOCALE_META[loc].label}
            aria-label={LOCALE_META[loc].label}
          >
            <FlagIcon locale={loc} className="h-3.5 w-5" />
            <span className="hidden sm:inline">{loc.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}