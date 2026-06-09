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
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'quintessence-sidebar-collapsed';

export function Sidebar() {
  const t = useTranslations('nav');
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
      return next;
    });
  };

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
        'fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-border bg-background transition-all duration-300 md:flex',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <span className="font-display text-lg font-semibold text-primary">Quintessence</span>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={collapsed ? t('expand') : t('collapse')}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {!collapsed && (
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}