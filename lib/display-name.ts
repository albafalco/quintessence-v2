/** Max length of profiles.display_name ("Megszólítás"), same as the DB check (migration 015). */
export const DISPLAY_NAME_MAX = 40;

/** How the app addresses the user: the chosen display name, or "@username" when none is set. */
export function addressName(displayName: string | null | undefined, username: string) {
  return displayName?.trim() || `@${username}`;
}

/** Input value → stored value (blank clears it). */
export function normalizeDisplayName(value: string) {
  const trimmed = value.trim().slice(0, DISPLAY_NAME_MAX);
  return trimmed || null;
}
