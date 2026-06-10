'use client';

import { usePathname } from 'next/navigation';
import { AuthBranding } from '@/components/auth/AuthBranding';
import { AuthBackgroundVideo } from '@/components/auth/AuthBackgroundVideo';

export function AuthLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname.includes('/auth/login');

  return (
    <div className="cosmic-bg relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-x-hidden p-4 pb-safe">
      {isLogin && <AuthBackgroundVideo />}

      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        {!isLogin && (
          <>
            <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-accent/8 blur-[80px]" />
          </>
        )}
      </div>

      <div className="relative z-10 flex w-full flex-col items-center">
        <AuthBranding />
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}