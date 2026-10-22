/** First / last name rules (migration 018); the DB checks the length too. */
export const NAME_PART_MAX = 50;

/** Name changes need admin approval; after one, the next can be asked for in 90 days. */
export const NAME_CHANGE_COOLDOWN_DAYS = 90;

/** Letters (any script), inner spaces, hyphens and apostrophes: "Anna Mária", "O'Brien", "de la Cruz". No dots: no abbreviations ("J."). */
const NAME_PART_RE = /^[\p{L}\p{M}](?:[\p{L}\p{M}' ’-]*[\p{L}\p{M}])?$/u;

/** No initials: at least two characters */
export const NAME_PART_MIN = 2;

export function normalizeNamePart(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function isValidNamePart(value: string) {
  const name = normalizeNamePart(value);
  return name.length >= NAME_PART_MIN && name.length <= NAME_PART_MAX && NAME_PART_RE.test(name);
}

/** Hungarian: family name first ("Fazekas Péter"); elsewhere: given name first. */
export function lastNameFirst(locale: string) {
  return locale === 'hu';
}

export function formatFullName(firstName: string, lastName: string, locale: string) {
  return lastNameFirst(locale) ? `${lastName} ${firstName}` : `${firstName} ${lastName}`;
}

/** When the user may ask for the next change (ISO), or null when it is allowed now. */
export function nextNameChangeAt(nameChangedAt: string | null, now = Date.now()) {
  if (!nameChangedAt) return null;
  const next = new Date(nameChangedAt).getTime() + NAME_CHANGE_COOLDOWN_DAYS * 86_400_000;
  return next > now ? new Date(next).toISOString() : null;
}
