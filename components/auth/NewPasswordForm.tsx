'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MIN_PASSWORD_LENGTH = 8;

export function NewPasswordForm({ tokenHash }: { tokenHash: string | null }) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  // The token is only redeemed on submit: link previews (e.g. in chat apps)
  // open the URL too and must not use up the one-time token
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!tokenHash) {
    return <p className="text-center text-sm text-red-400">{t('recoveryInvalid')}</p>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) return setError(t('errors.passwordTooShort'));
    if (password !== confirm) return setError(t('passwordsMismatch'));

    setLoading(true);
    const supabase = createClient();
    if (!verified) {
      const { error: verifyError } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
      if (verifyError) {
        setLoading(false);
        return setError(t('recoveryInvalid'));
      }
      setVerified(true);
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) return setError(t('passwordUpdateFailed'));
    setDone(true);
    setTimeout(() => {
      router.push(`/${locale}`);
      router.refresh();
    }, 1500);
  };

  if (done) {
    return <p className="rounded-xl border border-accent/25 bg-accent/5 px-3 py-2.5 text-center text-sm text-cream/90">{t('passwordUpdated')}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="newPassword">{t('newPassword')}</Label>
        <Input id="newPassword" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmNewPassword">{t('confirmNewPassword')}</Label>
        <Input
          id="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t('loading') : t('savePassword')}
      </Button>
    </form>
  );
}
