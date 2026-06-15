import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { hasSupabaseAuthCookie } from '@/lib/auth-cookie';
import { defaultLocale, locales } from './i18n';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

const publicPaths = ['/auth/login', '/auth/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${defaultLocale}`, request.url));
  }

  const pathnameWithoutLocale = pathname.replace(
    new RegExp(`^/(${locales.join('|')})`),
    ''
  );

  if (pathnameWithoutLocale.startsWith('/modules/angol')) {
    const locale = pathname.split('/')[1];
    if (locale !== 'hu') {
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
  }

  const isPublic = publicPaths.some((p) => pathnameWithoutLocale.startsWith(p));
  const response = intlMiddleware(request);
  const hasSession = hasSupabaseAuthCookie(request.cookies.getAll());

  if (!hasSession && !isPublic) {
    const locale = pathname.split('/')[1] || defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
  }

  if (hasSession && isPublic) {
    const locale = pathname.split('/')[1] || defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};