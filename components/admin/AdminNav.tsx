'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/hu/admin', label: 'Áttekintés' },
  { href: '/hu/admin/meghivok', label: 'Meghívókódok' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 rounded-2xl border border-border/40 bg-background/80 p-1">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'min-w-0 flex-1 truncate rounded-xl px-2 py-2 text-center text-sm font-medium transition-all',
              active ? 'bg-primary/30 text-accent shadow-sm' : 'text-muted-foreground hover:bg-muted/40 hover:text-cream'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
