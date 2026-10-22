'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FileJson, FileText, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { collectUserData, downloadJson } from '@/lib/data-export';
import { buildUserReportHtml, downloadHtml, type ExportData } from '@/lib/data-export-html';
import { loadMagiaFokozatok } from '@/lib/i18n-content';
import type { Locale } from '@/i18n';
import { removeCurrentDeviceSubscription } from '@/lib/push-subscription';
import { toBudapestDate } from '@/lib/push-reminders';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface AccountDataCardProps {
  userId: string;
  username: string;
  email: string;
  /** Which part to render: data download, or the account deletion */
  part: 'export' | 'delete';
}

export function AccountDataCard({ userId, username, email, part }: AccountDataCardProps) {
  const t = useTranslations('profile');
  const tExport = useTranslations('dataExport');
  const tMagia = useTranslations('magia');
  const tBadges = useTranslations('badges');
  const locale = useLocale();
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [exporting, setExporting] = useState<'html' | 'json' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: 'html' | 'json') => {
    setExporting(format);
    setError(null);
    try {
      const data = await collectUserData(createClient(), userId, email);
      const name = `quintessence-adataim-${toBudapestDate(new Date())}`;
      if (format === 'json') downloadJson(data, `${name}.json`);
      else {
        const fokozatok = await loadMagiaFokozatok(locale as Locale);
        const html = buildUserReportHtml(data as unknown as ExportData, {
          locale,
          t: tExport as never,
          tMagia: tMagia as never,
          tBadges: tBadges as never,
          fokozatok,
        });
        downloadHtml(html, `${name}.html`);
      }
    } catch (err) {
      console.error('[account] export failed', err);
      setError(t('exportFailed'));
    } finally {
      setExporting(null);
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

  if (part === 'export') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{t('exportHint')}</p>
        <div className="grid gap-2 pt-1 sm:grid-cols-2">
          {(
            [
              { format: 'html', icon: FileText, label: t('exportHtml'), hint: t('exportHtmlHint') },
              { format: 'json', icon: FileJson, label: t('exportJson'), hint: t('exportJsonHint') },
            ] as const
          ).map((item) => (
            <button
              key={item.format}
              type="button"
              onClick={() => void handleExport(item.format)}
              disabled={exporting !== null}
              className="flex items-start gap-3 rounded-xl border border-accent/30 px-4 py-3 text-left transition hover:bg-accent/10 disabled:opacity-50"
            >
              <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-accent">{exporting === item.format ? t('exporting') : item.label}</span>
                <span className="block text-[11px] leading-snug text-muted-foreground">{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      {confirmDialog}
    </div>
  );
}
