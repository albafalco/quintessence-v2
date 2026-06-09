'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  GraduationCap,
  LayoutDashboard,
  Layers,
  Sparkles,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();

  const items = [
    {
      href: `/${locale}`,
      label: t('dashboard'),
      icon: LayoutDashboard,
      match: (path: string) => path === `/${locale}` || path === `/${locale}/`,
      disabled: false,
    },
    {
      href: `/${locale}/modules/magia`,
      label: t('magia'),
      icon: Sparkles,
      match: (path: string) => path.includes('/modules/magia'),
      disabled: false,
    },
    {
      href: `/${locale}/modules/angol`,
      label: t('angol'),
      icon: GraduationCap,
      match: (path: string) => path.includes('/modules/angol'),
      disabled: locale !== 'hu',
    },
    {
      href: `/${locale}/profile`,
      label: t('profile'),
      icon: User,
      match: (path: string) => path.includes('/profile'),
      disabled: false,
    },
    {
      href: `/${locale}/modules/magia`,
      label: t('modules'),
      icon: Layers,
      match: (path: string) => path.includes('/modules'),
      disabled: false,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map(({ href, label, icon: Icon, match, disabled }) => {
          const active = !disabled && match(pathname);
          const content = (
            <>
              <Icon className={cn('h-5 w-5', active && 'text-primary')} />
              <span className={cn('text-[10px] font-medium', active && 'text-primary')}>
                {label}
              </span>
            </>
          );

          if (disabled) {
            return (
              <div
                key={label}
                className="flex flex-col items-center gap-1 px-2 py-1 text-muted-foreground/40"
                aria-hidden
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={href + label}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg px-2 py-1 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}