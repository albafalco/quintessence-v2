'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  GraduationCap,
  LayoutDashboard,
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
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 glass-strong md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2.5">
        {items.map(({ href, label, icon: Icon, match, disabled }) => {
          const active = !disabled && match(pathname);

          if (disabled) {
            return (
              <div
                key={label}
                className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground/25"
                aria-hidden
              >
                <Icon className="h-5 w-5" />
                <span className="text-[9px] font-medium">{label}</span>
              </div>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-all',
                active
                  ? 'text-accent'
                  : 'text-muted-foreground hover:text-cream'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                  active && 'bg-primary/25 shadow-glow-gold'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'text-accent')} />
              </div>
              <span className={cn('text-[9px] font-medium', active && 'text-accent')}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}