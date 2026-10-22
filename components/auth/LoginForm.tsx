'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { locales } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Supabase auth error → message key (auth.errors.*); its own text is English-only. */
function loginErrorKey(error: { code?: string; status?: number; message: string }) {
  if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) return 'errors.invalidCredentials';
  if (error.code === 'user_banned' || /banned/i.test(error.message)) return 'errors.accountSuspended';
  if (error.status === 429 || error.code === 'over_request_rate_limit') return 'errors.tooManyAttempts';
  return 'errors.loginFailed';
}

export function LoginForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(t(loginErrorKey(signInError)));
      return;
    }

    // Continue in the user's own language (set in the sidebar / account menu)
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', signInData.user.id)
      .maybeSingle();
    const preferred = profile?.preferred_language;
    const target = preferred && (locales as readonly string[]).includes(preferred) ? preferred : locale;

    setLoading(false);
    router.push(`/${target}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          minLength={8}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" variant="gold" className="w-full" disabled={loading}>
        {loading ? t('loading') : t('login')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link href={`/${locale}/auth/register`} className="text-primary hover:underline">
          {t('register')}
        </Link>
      </p>
    </form>
  );
}