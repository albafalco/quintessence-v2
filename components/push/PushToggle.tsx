'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import {
  isPushSupported,
  isStandalonePwa,
  subscribeToPush,
  waitForServiceWorker,
} from '@/lib/push-client';
import { clearPushSubscription, persistPushSubscription } from '@/lib/push-subscription';
import { cn } from '@/lib/utils';

interface PushToggleProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  label: string;
}

function mapPushError(error: unknown, t: (key: string) => string): string {
  const message = error instanceof Error ? error.message : '';

  if (message === 'SERVICE_WORKER_UNSUPPORTED') return t('pushErrorServiceWorker');
  if (message === 'SERVICE_WORKER_TIMEOUT') return t('pushErrorServiceWorker');
  if (message === 'VAPID_MISSING') return t('pushErrorVapid');
  if (message === 'INVALID_SUBSCRIPTION') return t('pushErrorSubscribe');
  if (message.includes('Subscribe failed')) return `${t('pushErrorSubscribe')} (${message})`;

  return t('pushErrorGeneric');
}

export function PushToggle({ enabled, onEnabledChange, label }: PushToggleProps) {
  const t = useTranslations('profile');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'error' | 'success' | 'info'>('info');
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    async function syncExistingSubscription() {
      if (!isPushSupported() || Notification.permission !== 'granted') {
        setSyncing(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) {
          setSyncing(false);
          return;
        }

        const registration = await waitForServiceWorker();
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          await persistPushSubscription(supabase, user.id, subscription);
          if (!cancelled) {
            onEnabledChange(true);
          }
        } else if (enabled) {
          // iOS may silently drop the push subscription between sessions.
          // Try to re-subscribe without a permission dialog (already granted).
          try {
            const newSubscription = await subscribeToPush();
            await persistPushSubscription(supabase, user.id, newSubscription);
            if (!cancelled) {
              onEnabledChange(true);
            }
          } catch {
            await clearPushSubscription(supabase, user.id);
            if (!cancelled) {
              onEnabledChange(false);
            }
          }
        }
      } catch {
        // sync is best-effort on load
      } finally {
        if (!cancelled) setSyncing(false);
      }
    }

    syncExistingSubscription();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (checked: boolean) => {
    setFeedback(null);

    if (!checked) {
      onEnabledChange(false);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await clearPushSubscription(supabase, user.id);
        try {
          const registration = await navigator.serviceWorker.getRegistration('/');
          const subscription = await registration?.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }
        } catch {
          // ignore unsubscribe errors
        }
      }
      return;
    }

    if (!isPushSupported()) {
      setFeedbackType('error');
      setFeedback(t('pushErrorNotSupported'));
      onEnabledChange(false);
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Subscribe failed: not authenticated');
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setFeedbackType('error');
        setFeedback(t('pushErrorPermission'));
        onEnabledChange(false);
        return;
      }

      const subscription = await subscribeToPush();
      await persistPushSubscription(supabase, user.id, subscription);

      onEnabledChange(true);
      setFeedbackType('success');
      setFeedback(t('pushSuccess'));

      const testRes = await fetch('/api/push/test', {
        method: 'POST',
        credentials: 'include',
      });

      if (!testRes.ok) {
        setFeedbackType('info');
        setFeedback(t('pushEnabledButTestFailed'));
      }
    } catch (error) {
      setFeedbackType('error');
      setFeedback(mapPushError(error, t));
      onEnabledChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="push-toggle">{label}</Label>
        <Switch
          id="push-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={loading || syncing}
        />
      </div>

      {!enabled && !isPushSupported() && (
        <p className="text-xs text-muted-foreground">{t('pushErrorNotSupported')}</p>
      )}

      {!enabled && isPushSupported() && !isStandalonePwa() && (
        <p className="text-xs text-muted-foreground">{t('pushIosHint')}</p>
      )}

      {feedback && (
        <p
          className={cn(
            'text-xs',
            feedbackType === 'error' && 'text-red-300',
            feedbackType === 'success' && 'text-accent',
            feedbackType === 'info' && 'text-muted-foreground'
          )}
        >
          {feedback}
        </p>
      )}
    </div>
  );
}