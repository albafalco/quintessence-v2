import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Locked modules: only users picked by the admin see them (migration 016).
 * 'feher_magia' is the new Fehér Mágia path while it is being built (migration 020);
 * everyone else keeps the current module until the switch.
 */
export type LockedModule = 'angol' | 'feher_magia';

/** Kreatív Angol content is Hungarian-only. */
export const ANGOL_LOCALE = 'hu';

/** Access granted by the admin (admins always have it). Closed on any error. */
export async function hasModuleAccess(supabase: SupabaseClient, module: LockedModule): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_module_access', { p_module: module });
  if (error) {
    console.error('[module-access] check failed', error.message);
    return false;
  }
  return data === true;
}

/** Kreatív Angol is shown only on the Hungarian UI and only with access. */
export async function canUseAngol(supabase: SupabaseClient, locale: string): Promise<boolean> {
  return locale === ANGOL_LOCALE && hasModuleAccess(supabase, 'angol');
}
