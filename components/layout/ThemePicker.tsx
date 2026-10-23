'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { THEME_PREFERENCES, type ThemePreference } from '@/lib/theme';
import { useTheme } from './ThemeProvider';
import { cn } from '@/lib/utils';

const NAME_KEYS: Record<ThemePreference, string> = {
  quintessence: 'themeQuintessence',
  hajnal: 'themeHajnal',
  system: 'themeSystem',
};

/** Fixed colours: the swatch shows the theme itself, whatever theme is active. */
const SWATCH = {
  dark: { bg: '#0a0812', card: '#1c1630', ink: '#f5f0e8', gold: '#D4AF37' },
  light: { bg: '#F7F2E7', card: '#FFFCF5', ink: '#2A1F45', gold: '#8C6A10' },
};

function Half({ colors, className }: { colors: (typeof SWATCH)['dark']; className?: string }) {
  return (
    <span className={cn('absolute inset-0 block', className)} style={{ background: colors.bg }}>
      <span className="absolute left-[14%] top-[22%] block h-[56%] w-[72%] rounded-[3px]" style={{ background: colors.card }}>
        <span className="absolute left-[12%] top-[22%] block h-[16%] w-[46%] rounded-full" style={{ background: colors.gold }} />
        <span className="absolute left-[12%] top-[56%] block h-[12%] w-[70%] rounded-full opacity-70" style={{ background: colors.ink }} />
      </span>
    </span>
  );
}

/** Mini picture of a theme; "system" is half light, half dark. */
function ThemeSwatch({ theme, className }: { theme: ThemePreference; className?: string }) {
  return (
    <span aria-hidden className={cn('relative block shrink-0 overflow-hidden rounded-md border border-border/60', className)}>
      {theme === 'system' ? (
        <>
          <Half colors={SWATCH.light} />
          <Half colors={SWATCH.dark} className="[clip-path:polygon(100%_0,100%_100%,0_100%)]" />
        </>
      ) : (
        <Half colors={theme === 'hajnal' ? SWATCH.light : SWATCH.dark} />
      )}
    </span>
  );
}

function useThemeName() {
  const t = useTranslations('nav');
  return (theme: ThemePreference) => t(NAME_KEYS[theme]);
}

/** Settings → Appearance: three picture tiles */
export function ThemeTiles() {
  const t = useTranslations('nav');
  const { preference, setPreference } = useTheme();
  const name = useThemeName();
  const descKeys: Record<ThemePreference, string> = {
    quintessence: 'themeQuintessenceDesc',
    hajnal: 'themeHajnalDesc',
    system: 'themeSystemDesc',
  };
  return (
    <div role="radiogroup" aria-label={t('appearance')} className="grid grid-cols-3 gap-2 sm:gap-3">
      {THEME_PREFERENCES.map((theme) => {
        const active = theme === preference;
        return (
          <button
            key={theme}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(theme)}
            className={cn(
              'flex flex-col items-stretch gap-2 rounded-xl border p-2 text-left transition sm:p-2.5',
              active ? 'border-accent/60 bg-accent/5' : 'border-border/60 hover:border-accent/30'
            )}
          >
            <ThemeSwatch theme={theme} className="aspect-[16/10] w-full" />
            <span className="flex items-center gap-1 text-xs font-semibold text-cream">
              <span className="min-w-0 flex-1 truncate">{name(theme)}</span>
              {active && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
            </span>
            <span className="hidden text-[11px] leading-snug text-muted-foreground sm:block">{t(descKeys[theme])}</span>
          </button>
        );
      })}
    </div>
  );
}
