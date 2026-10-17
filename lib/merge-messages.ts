type Messages = Record<string, unknown>;

/**
 * Translation fallback: `messages` on top of `fallback`, key by key, so a text
 * missing from a (beta) language shows in the fallback language instead of
 * a raw key.
 */
export function mergeMessages(fallback: Messages, messages: Messages): Messages {
  const result: Messages = { ...fallback };
  for (const [key, value] of Object.entries(messages)) {
    const base = result[key];
    result[key] =
      value && typeof value === 'object' && base && typeof base === 'object'
        ? mergeMessages(base as Messages, value as Messages)
        : value;
  }
  return result;
}
