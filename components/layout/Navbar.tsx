'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ShieldLogo } from '@/components/ui/ShieldLogo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { cn } from '@/lib/utils';

interface NavbarProps {
  username: string;
}

export function Navbar({ username }: NavbarProps) {
  const t = useTranslations('nav');
  const locale = useLocale();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/40 glass px-4 md:px-6">
      <Link href={`/${locale}`} className="flex items-center gap-2.5 md:hidden">
        <ShieldLogo size={32} showGlow />
        <span className="font-display text-base font-semibold text-gradient-gold">Quintessence</span>
      </Link>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>
        <div className="sm:hidden">
          <LanguageSwitcher compact />
        </div>

        <Link
          href={`/${locale}/profile`}
          className={cn(
            'flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/30 px-3 py-1.5',
            'transition-all hover:border-accent/30 hover:bg-muted/50'
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cosmic text-xs font-bold text-accent">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="hidden text-sm sm:block">
            <span className="text-muted-foreground">{t('greeting')} </span>
            <span className="font-medium text-cream">@{username}</span>
          </div>
        </Link>
      </div>
    </header>
  );
}