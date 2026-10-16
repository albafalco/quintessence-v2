'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ShieldLogo } from '@/components/ui/ShieldLogo';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export function Navbar() {
  const t = useTranslations('nav');
  const tBrand = useTranslations('brand');
  const locale = useLocale();
  const [username, setUsername] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.username) setUsername(data.username);
        });
    });
  }, []);

  return (
    // The safe-area padding (iPhone status bar) sits on top of the full-height
    // content row instead of eating into it.
    <header className="sticky top-0 z-30 min-w-0 border-b border-border/40 glass pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 min-w-0 items-center justify-between gap-2 overflow-hidden px-3 sm:h-16 sm:px-4 md:px-6">
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
            <UserAvatar username={username} className="h-7 w-7 text-xs sm:h-8 sm:w-8" />
            <div className="hidden text-sm md:block">
              <span className="text-muted-foreground">{t('greeting')} </span>
              <span className="font-medium text-cream">@{username}</span>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
