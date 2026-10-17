'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { canUseAngol } from '@/lib/module-access';

/** null while loading — locked modules stay hidden until access is confirmed. */
const AngolAccessContext = createContext<boolean | null>(null);

export function ModuleAccessProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const [angol, setAngol] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () =>
      canUseAngol(createClient(), locale).then((ok) => {
        if (!cancelled) setAngol(ok);
      });
    void check();
    // Access granted or taken away while the app is open
    const onVisible = () => document.visibilityState === 'visible' && void check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [locale]);

  return <AngolAccessContext.Provider value={angol}>{children}</AngolAccessContext.Provider>;
}

/** Kreatív Angol available to this user on this UI: true / false, or null while loading. */
export function useAngolAccess() {
  return useContext(AngolAccessContext);
}
