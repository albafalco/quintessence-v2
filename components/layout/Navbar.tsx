'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ShieldLogo } from '@/components/ui/ShieldLogo';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { cn } from '@/lib/utils';

interface NavbarProps {
  username: string;
}

export function Navbar({ username }: NavbarProps) {
  const t = useTranslations('nav');
  const tBrand = useTranslations('brand');
  const locale = useLocale();

  return (
    <header className="sticky top-0 z-30 flex h-14 min-w-0 items-center justify-between gap-2 overflow-hidden border-b border-border/40 glass px-3 pt-[env(safe-area-inset-top)] sm:h-16 sm:px-4 md:px-6">
      <Link href={`/${locale}`} className="flex min-w-0 shrink items-center gap-2 md:hidden">
        <ShieldLogo size={28} showGlow className="shrink-0 sm:hidden" />
        <ShieldLogo size={32} showGlow className="hidden shrink-0 sm:block" />
        <span className="hidden truncate font-display text-sm font-semibold text-gradient-gold min-[400px]:inline sm:text-base">
          {tBrand('name')}
        </span>
      </Link>

      <div className="hidden min-w-0 md:block" />

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <LanguageSwitcher />

        <LogoutButton variant="icon" showLabel={false} />

        <Link
          href={`/${locale}/profile`}
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-xl border border-border/50 bg-muted/30 p-1.5 sm:gap-2.5 sm:px-3 sm:py-1.5',
            'transition-all hover:border-accent/30 hover:bg-muted/50'
          )}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cosmic text-xs font-bold text-accent sm:h-8 sm:w-8">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="hidden text-sm md:block">
            <span className="text-muted-foreground">{t('greeting')} </span>
            <span className="font-medium text-cream">@{username}</span>
          </div>
        </Link>
      </div>
    </header>
  );
}