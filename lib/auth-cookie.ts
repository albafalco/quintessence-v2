export function hasSupabaseAuthCookie(
  cookies: { name: string; value: string }[]
): boolean {
  return cookies.some(
    (cookie) => cookie.name.includes('-auth-token') && cookie.value.length > 0
  );
}