'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Download, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { collectUserData, downloadJson } from '@/lib/data-export';
import { removeCurrentDeviceSubscription } from '@/lib/push-subscription';
import { toBudapestDate } from '@/lib/push-reminders';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AccountDataCardProps {
  userId: string;
  username: string;
  email: string;
}

export function AccountDataCard({ userId, username, email }: AccountDataCardProps) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const data = await collectUserData(createClient(), userId, email);
      downloadJson(data, `quintessence-adataim-${toBudapestDate(new Date())}.json`);
    } catch (err) {
      console.error('[account] export failed', err);
      setError(t('exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      message: t('deleteAccountConfirm'),
      confirmLabel: t('deleteAccountButton'),
      cancelLabel: t('cancel'),
      destructive: true,
      requireText: username,
      requireTextLabel: t('deleteAccountTypeUsername', { username }),
    });
    if (!ok) return;

    setDeleting(true);
    setError(null);
    const supabase = createClient();
    try {
      // While still signed in: stop this device from receiving notifications
      await removeCurrentDeviceSubscription(supabase, userId);
    } catch {
      // best-effort
    }

    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmUsername: username }),
    }).catch(() => null);

    if (!res?.ok) {
      setDeleting(false);
      setError(t('deleteAccountFailed'));
      return;
    }

    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    router.replace(`/${locale}/auth/login?deleted=1`);
    router.refresh();
  };

  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="text-gradient-gold">{t('myDataTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t('exportHint')}</p>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-accent/30 px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/10 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? t('exporting') : t('exportButton')}
          </button>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/40 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t('deleteAccountHint')}</p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-900/20 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? t('deleting') : t('deleteAccountButton')}
          </button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </CardContent>
      {confirmDialog}
    </Card>
  );
}
