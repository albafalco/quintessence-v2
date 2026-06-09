'use client';

import { useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { locales } from '@/i18n';
import { LOCALE_META } from '@/lib/locale-meta';
import { FlagIcon } from '@/components/ui/FlagIcon';
import { cn } from '@/lib/utils';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/') || `/${newLocale}`);
    setOpen(false);
  };

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((v) => !v);
  };

  return (
    <>
      {/* Mobile: csak az aktív zászló, kattintásra fixed dropdown */}
      <div className="sm:hidden">
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 px-2 py-1.5 transition-all hover:bg-muted/60"
          title={LOCALE_META[locale as keyof typeof LOCALE_META].label}
          aria-label={LOCALE_META[locale as keyof typeof LOCALE_META].label}
          aria-expanded={open}
        >
          <FlagIcon locale={locale} className="h-3 w-4" />
          <span className="text-xs font-medium text-accent">{locale.toUpperCase()}</span>
          <ChevronDown
            className={cn('h-3 w-3 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
          />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              className="fixed z-50 min-w-[9rem] overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl"
              style={{ top: dropdownPos.top, right: dropdownPos.right }}
            >
              {locales.map((loc) => {
                const active = loc === locale;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => switchLocale(loc)}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors',
                      active ? 'bg-primary/20 text-accent' : 'text-foreground hover:bg-muted/60'
                    )}
                    aria-current={active ? 'true' : undefined}
                  >
                    <FlagIcon locale={loc} className="h-3.5 w-5 shrink-0" />
                    <span className="font-medium">{loc.toUpperCase()}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {LOCALE_META[loc as keyof typeof LOCALE_META].label}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Desktop (sm+): változatlan — minden zászló egyszerre látható */}
      <div className="hidden items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 sm:flex">
        {locales.map((loc) => {
          const active = loc === locale;
          return (
            <button
              key={loc}
              type="button"
              onClick={() => switchLocale(loc)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all',
                active
                  ? 'bg-primary/30 text-accent shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
              title={LOCALE_META[loc as keyof typeof LOCALE_META].label}
              aria-label={LOCALE_META[loc as keyof typeof LOCALE_META].label}
              aria-current={active ? 'true' : undefined}
            >
              <FlagIcon locale={loc} className="h-3.5 w-5" />
              <span className="text-xs font-medium">{loc.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
