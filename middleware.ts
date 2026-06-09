import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { defaultLocale, locales } from './i18n';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

const publicPaths = ['/auth/login', '/auth/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Locale redirect: / → /hu
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${defaultLocale}`, request.url));
  }

  const pathnameWithoutLocale = pathname.replace(
    new RegExp(`^/(${locales.join('|')})`),
    ''
  );

  // Angol modul guard: only hu locale
  if (pathnameWithoutLocale.startsWith('/modules/angol')) {
    const locale = pathname.split('/')[1];
    if (locale !== 'hu') {
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
  }

  const isPublic = publicPaths.some((p) => pathnameWithoutLocale.startsWith(p));

  let response = intlMiddleware(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic && pathnameWithoutLocale !== '') {
    const locale = pathname.split('/')[1] || defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
  }

  if (user && isPublic) {
    const locale = pathname.split('/')[1] || defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};