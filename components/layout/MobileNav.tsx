'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ElementsNavIcon } from '@/components/ui/ElementsIcon';

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
    },
    {
      // Opens on the daily practice; the module's own tabs lead on
      href: `/${locale}/modules/magia/ma`,
      label: t('magia'),
      icon: ElementsNavIcon,
      match: (path: string) => path.includes('/modules/magia'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 glass-strong pb-nav-safe md:hidden">
      <div className="mx-auto flex w-full max-w-lg items-center justify-around px-1 pb-1 pt-1.5">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1 transition-all',
                active
                  ? 'text-accent'
                  : 'text-muted-foreground hover:text-cream'
              )}
            >
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-xl transition-all',
                  active && 'bg-primary/25'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'text-accent')} />
              </div>
              <span className={cn('max-w-full truncate text-[9px] font-medium', active && 'text-accent')}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}