'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from './AppShell';

interface ConditionalAppShellProps {
  children: React.ReactNode;
  username: string;
}

export function ConditionalAppShell({ children, username }: ConditionalAppShellProps) {
  const pathname = usePathname();
  const isAuthPage = pathname.includes('/auth/');

  if (isAuthPage) {
    return <>{children}</>;
  }

  return <AppShell username={username}>{children}</AppShell>;
}