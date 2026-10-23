import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, locales, type Locale } from './i18n';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

const publicPaths = ['/auth/login', '/auth/register'];
// Reachable with or without a session (password reset link)
const openPaths = ['/auth/uj-jelszo'];

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Redirect while keeping any auth cookies the session refresh just wrote. */
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // "/": next-intl picks the remembered language (cookie) or the browser's
  // (Accept-Language), falling back to the default
  if (pathname === '/') {
    return intlMiddleware(request);
  }

  // Paths without a valid locale prefix (e.g. "/profile") are handed to
  // next-intl, which redirects to the prefixed URL. Treating the first
  // segment as a locale here caused an infinite redirect loop.
  const firstSegment = pathname.split('/')[1] ?? '';
  if (!isLocale(firstSegment)) {
    return intlMiddleware(request);
  }

  const locale = firstSegment;
  const pathnameWithoutLocale = pathname.slice(locale.length + 1) || '/';

  const response = intlMiddleware(request);

  // Refresh the Supabase session here: Server Components cannot write cookies,
  // so a token refreshed there would be lost and the rotated refresh token
  // could later log the user out. getSession() only calls the network when
  // the access token has expired, so cold starts stay fast.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const hasSession = Boolean(session);
  if (openPaths.some((p) => pathnameWithoutLocale.startsWith(p))) {
    return response;
  }

  const isPublic = publicPaths.some((p) => pathnameWithoutLocale.startsWith(p));

  if (!hasSession && !isPublic) {
    return redirectWithCookies(new URL(`/${locale}/auth/login`, request.url), response);
  }

  if (hasSession && isPublic) {
    return redirectWithCookies(new URL(`/${locale}`, request.url), response);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
