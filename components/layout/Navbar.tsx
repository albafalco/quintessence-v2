'use client';

import { useTranslations } from 'next-intl';

interface NavbarProps {
  username: string;
}

export function Navbar({ username }: NavbarProps) {
  const t = useTranslations('nav');

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
      <div className="md:hidden">
        <span className="font-display text-lg font-semibold text-primary">Quintessence</span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="hidden sm:inline">{t('greeting')}</span>
        <span className="font-medium text-foreground">@{username}</span>
      </div>
    </header>
  );
}