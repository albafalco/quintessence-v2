'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  applyTheme,
  isThemePreference,
  resolveTheme,
  type ThemePreference,
} from '@/lib/theme';

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ preference: DEFAULT_THEME, setPreference: () => {} });

function readStored(): ThemePreference | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : null;
  } catch {
    return null;
  }
}

function store(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // private mode: the profile still remembers it
  }
}

/**
 * The inline <head> script already painted the stored theme; this keeps it in
 * sync with the profile (same theme on every device) and follows the system
 * setting while "Automatikus" is chosen.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(DEFAULT_THEME);

  // Local choice first, then the profile (the profile wins: set on another device)
  useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => setPreferenceState(readStored() ?? DEFAULT_THEME));
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('theme').eq('id', user.id).maybeSingle();
      const saved = (data as { theme?: string } | null)?.theme;
      if (cancelled || !isThemePreference(saved) || saved === readStored()) return;
      store(saved);
      setPreferenceState(saved);
    })().catch(() => {});
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);

  // Apply, and follow the device while "system" is chosen
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => applyTheme(resolveTheme(preference, media.matches));
    apply();
    if (preference !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    store(next);
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('profiles').update({ theme: next }).eq('id', user.id);
      if (error) console.error('[theme] saving failed', error.message);
    })();
  }, []);

  return <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
