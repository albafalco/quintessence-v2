'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Bell, ChevronRight, GraduationCap, LayoutDashboard, ShieldCheck, User, type LucideIcon } from 'lucide-react';
import { ElementsNavIcon } from '@/components/ui/ElementsIcon';
import { ROMAN_NUMERALS } from '@/lib/magia-utils';
import angolLabels from '@/messages/content/angol-lesson1-labels.hu.json';
import { cn } from '@/lib/utils';

interface Crumb {
  label: string;
  href: string;
}

/** Admin pages are Hungarian-only (same labels as AdminNav). */
const ADMIN_LABELS: Record<string, string> = {
  felhasznalok: 'Felhasználók',
  meghivok: 'Meghívók',
  kozlemenyek: 'Közlemények',
  push: 'Push',
};

/** Desktop header: "Fehér Mágia › III. Fokozat" — where am I, one click back up. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const locale = useLocale();
  const tNav = useTranslations('nav');
  const tMagia = useTranslations('magia');
  const tAngol = useTranslations('angol');
  const tNotifications = useTranslations('notifications');

  const base = `/${locale}`;
  const parts = pathname.split('/').filter(Boolean).slice(1);
  const crumbs: Crumb[] = [];
  let Icon: LucideIcon | typeof ElementsNavIcon = LayoutDashboard;

  if (parts.length === 0) {
    crumbs.push({ label: tNav('dashboard'), href: base });
  } else if (parts[0] === 'modules' && parts[1] === 'magia') {
    Icon = ElementsNavIcon;
    const root = `${base}/modules/magia`;
    crumbs.push({ label: tNav('magia'), href: root });
    if (parts[2] === 'ma') crumbs.push({ label: tMagia('maTitle'), href: `${root}/ma` });
    if (parts[2] === 'jelentes') crumbs.push({ label: tMagia('reportTitle'), href: `${root}/jelentes` });
    if (parts[2] === 'fokozat' && ROMAN_NUMERALS[Number(parts[3])])
      crumbs.push({ label: `${ROMAN_NUMERALS[Number(parts[3])]}. ${tMagia('fokozat')}`, href: `${root}/fokozat/${parts[3]}` });
  } else if (parts[0] === 'modules' && parts[1] === 'angol') {
    Icon = GraduationCap;
    const root = `${base}/modules/angol`;
    crumbs.push({ label: tNav('angol'), href: root });
    if (parts[2] === 'lecke' && parts[3]) {
      const lesson = `${root}/lecke/${parts[3]}`;
      crumbs.push({ label: `${parts[3]}. ${tAngol('lesson').toLocaleLowerCase(locale)}`, href: lesson });
      if (parts[4] === 'nehez') crumbs.push({ label: tAngol('hardTitle'), href: `${lesson}/nehez` });
      if (parts[4] === 'szakasz' && parts[5]) {
        const label = (angolLabels.sectionLabels as Record<string, string>)[parts[5]];
        if (label) crumbs.push({ label, href: `${lesson}/szakasz/${parts[5]}` });
      }
    }
  } else if (parts[0] === 'profile') {
    Icon = User;
    crumbs.push({ label: tNav('profile'), href: `${base}/profile` });
  } else if (parts[0] === 'ertesitesek') {
    Icon = Bell;
    crumbs.push({ label: tNotifications('title'), href: `${base}/ertesitesek` });
  } else if (parts[0] === 'admin') {
    Icon = ShieldCheck;
    crumbs.push({ label: tNav('admin'), href: '/hu/admin' });
    if (ADMIN_LABELS[parts[1]]) crumbs.push({ label: ADMIN_LABELS[parts[1]], href: `/hu/admin/${parts[1]}` });
  }

  if (crumbs.length === 0) return <div className="hidden min-w-0 md:block" />;

  return (
    <nav aria-label={tNav('breadcrumb')} className="hidden min-w-0 items-center gap-2 text-sm md:flex">
      <Icon className="h-4 w-4 shrink-0 text-accent" />
      <ol className="flex min-w-0 items-center gap-1.5">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={crumb.href} className={cn('flex items-center gap-1.5', last ? 'min-w-0' : 'shrink-0')}>
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
              {last ? (
                <span aria-current="page" className="truncate font-medium text-cream">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="text-muted-foreground transition hover:text-accent">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
