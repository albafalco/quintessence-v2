'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ShieldLogo } from '@/components/ui/ShieldLogo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { UserMenu } from './UserMenu';
import { MomentumChip } from './MomentumChip';
import { createClient } from '@/lib/supabase/client';
import { formatFullName } from '@/lib/person-name';

export function Navbar() {
  const tBrand = useTranslations('brand');
  const locale = useLocale();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.username) setUsername(data.username);
          if (data?.first_name && data?.last_name) setName(formatFullName(data.first_name, data.last_name, locale));
          else if (data?.name) setName(data.name);
        });
      // Only lists the menu link; the admin area checks access (2FA) itself
      supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => setIsAdmin(Boolean(data)));
    });
  }, [locale]);

  return (
    // The safe-area padding (iPhone status bar) sits on top of the full-height
    // content row instead of eating into it.
    <header className="sticky top-0 z-30 min-w-0 border-b border-border/40 glass pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 min-w-0 items-center justify-between gap-2 overflow-hidden px-3 sm:h-16 sm:px-4 md:px-6">
        <Link href={`/${locale}`} className="flex min-w-0 shrink items-center gap-2 md:hidden">
          <ShieldLogo size={28} className="shrink-0 sm:hidden" />
          <ShieldLogo size={32} className="hidden shrink-0 sm:block" />
          <span className="hidden truncate font-display text-sm font-semibold text-gradient-gold min-[400px]:inline sm:text-base">
            {tBrand('name')}
          </span>
        </Link>

        <div className="hidden min-w-0 md:block" />

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <MomentumChip />

          <NotificationBell />

          <UserMenu username={username} name={name} isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  );
}
