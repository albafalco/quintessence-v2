'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RegisterForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, email, password, inviteCode }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      const errorCode = data.errorCode as string | undefined;
      const errorKeyMap: Record<string, string> = {
        SERVER_CONFIG: 'errors.serverConfig',
        MISSING_FIELDS: 'errors.missingFields',
        INVALID_USERNAME: 'errors.invalidUsername',
        PASSWORD_TOO_SHORT: 'errors.passwordTooShort',
        INVALID_INVITE: 'errors.invalidInvite',
        REGISTRATION_FAILED: 'errors.registrationFailed',
        METHOD_NOT_ALLOWED: 'errors.methodNotAllowed',
      };
      setError(
        errorCode && errorKeyMap[errorCode]
          ? t(errorKeyMap[errorCode] as 'errors.serverConfig')
          : data.error ?? t('registerError')
      );
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    router.push(`/${locale}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('name')}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">{t('username')}</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          required
          pattern="[a-z0-9_-]+"
          autoComplete="username"
        />
      </div>

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
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="inviteCode">{t('inviteCode')}</Label>
        <Input
          id="inviteCode"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          required
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" variant="gold" className="w-full" disabled={loading}>
        {loading ? t('loading') : t('register')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('hasAccount')}{' '}
        <Link href={`/${locale}/auth/login`} className="text-primary hover:underline">
          {t('login')}
        </Link>
      </p>
    </form>
  );
}