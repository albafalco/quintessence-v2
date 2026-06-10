'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  Sparkles,
  User,
} from 'lucide-react';
import { ShieldLogo } from '@/components/ui/ShieldLogo';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'quintessence-sidebar-collapsed';

export function Sidebar() {
  const t = useTranslations('nav');
  const tBrand = useTranslations('brand');
  const locale = useLocale();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      document.documentElement.style.setProperty('--sidebar-width', next ? '4.5rem' : '16rem');
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? '4.5rem' : '16rem');
  }, [collapsed]);

  const links = [
    {
      href: `/${locale}`,
      label: t('dashboard'),
      icon: LayoutDashboard,
      match: (path: string) => path === `/${locale}` || path === `/${locale}/`,
    },
    {
      href: `/${locale}/modules/magia`,
      label: t('magia'),
      icon: Sparkles,
      match: (path: string) => path.includes('/modules/magia'),
    },
    ...(locale === 'hu'
      ? [
          {
            href: `/${locale}/modules/angol`,
            label: t('angol'),
            icon: GraduationCap,
            match: (path: string) => path.includes('/modules/angol'),
          },
        ]
      : []),
    {
      href: `/${locale}/profile`,
      label: t('profile'),
      icon: User,
      match: (path: string) => path.includes('/profile'),
    },
  ];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-border/50 glass-strong transition-all duration-300 md:flex',
        collapsed ? 'w-[4.5rem]' : 'w-64'
      )}
    >
      <div
        className={cn(
          'relative flex h-16 items-center border-b border-border/40',
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}
      >
        <Link
          href={`/${locale}`}
          className={cn(
            'flex items-center gap-3 overflow-hidden',
            collapsed && 'justify-center'
          )}
        >
          <ShieldLogo size={36} showGlow />
          {!collapsed && (
            <span className="font-display text-lg font-semibold tracking-wide text-gradient-gold">
              {tBrand('name')}
            </span>
          )}
        </Link>
        {!collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-accent"
            aria-label={t('collapse')}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="absolute -right-3 top-1/2 z-50 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-md transition-colors hover:border-accent/40 hover:text-accent"
            aria-label={t('expand')}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 p-3">
        {!collapsed && (
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent/70">
            {t('modules')}
          </p>
        )}
        {links.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'nav-item-active'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-cream',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  active ? 'text-accent' : 'group-hover:text-accent/80'
                )}
              />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/40 p-3">
        <LogoutButton variant="nav" showLabel={!collapsed} />
      </div>
    </aside>
  );
}