/**
 * Appearance: Quintessence (dark, the brand look and default), Hajnal (light)
 * or System (follows the device). The colours live in globals.css as CSS
 * variables under [data-theme='dark'] / [data-theme='light'].
 */
export type ThemePreference = 'quintessence' | 'hajnal' | 'system';
export type AppliedTheme = 'dark' | 'light';

export const THEME_PREFERENCES: ThemePreference[] = ['quintessence', 'hajnal', 'system'];
export const DEFAULT_THEME: ThemePreference = 'quintessence';
export const THEME_STORAGE_KEY = 'quintessence-theme';

/** Browser / phone bar colour per theme */
export const THEME_COLORS: Record<AppliedTheme, string> = { dark: '#3B2A6E', light: '#F7F2E7' };

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as string[]).includes(value);
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): AppliedTheme {
  if (preference === 'hajnal') return 'light';
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  return 'dark';
}

/** Sets the theme on <html> and the browser bar colour. */
export function applyTheme(theme: AppliedTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

/**
 * Runs in <head> before the first paint, so a light theme never flashes dark
 * (the same logic as resolveTheme + applyTheme, kept dependency-free).
 */
export const THEME_INLINE_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||"quintessence";var d=p==="system"?window.matchMedia("(prefers-color-scheme: dark)").matches:p!=="hajnal";var t=d?"dark":"light";var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="dark"?${JSON.stringify(THEME_COLORS.dark)}:${JSON.stringify(THEME_COLORS.light)});}catch(e){}})();`;
