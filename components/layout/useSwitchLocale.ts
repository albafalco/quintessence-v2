'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Locale } from '@/i18n';

/**
 * One language for everything: switches the UI (URL locale) and saves it as
 * preferred_language, which the push notifications use too.
 */
export function useSwitchLocale() {
  const pathname = usePathname();
  const router = useRouter();

  return useCallback(
    async (next: Locale) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ preferred_language: next, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        if (error) console.error('[locale] saving preferred_language failed', error);
      }
      const segments = pathname.split('/');
      segments[1] = next;
      router.push(segments.join('/') || `/${next}`);
      router.refresh();
    },
    [pathname, router]
  );
}
