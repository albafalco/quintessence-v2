/**
 * True when a Supabase/PostgREST error means a column does not exist yet —
 * i.e. the code was deployed before the matching migration was run.
 * Callers then retry without the new column so existing features keep working.
 */
export function isMissingColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  // PGRST204: column not found in the schema cache (insert/update payload)
  // 42703: undefined_column (select / filter)
  return error.code === 'PGRST204' || error.code === '42703';
}
