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
  const name = error instanceof Error ? error.name : '';

  if (message === 'SERVICE_WORKER_UNSUPPORTED') return t('pushErrorServiceWorker');
  if (message === 'SERVICE_WORKER_TIMEOUT') return t('pushErrorServiceWorker');
  if (message === 'VAPID_MISSING') return t('pushErrorVapid');
  if (message === 'INVALID_SUBSCRIPTION') return t('pushErrorSubscribe');
  if (message.includes('Subscribe failed')) return `${t('pushErrorSubscribe')} (${message})`;
  // Chrome FCM "Registration failed - push service error"
  if (name === 'AbortError' || message.includes('push service error')) return t('pushErrorFcm');

  return t('pushErrorGeneric');
}

export function PushToggle({ enabled, onEnabledChange, label }: PushToggleProps) {
  const t = useTranslations('profile');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'error' | 'success' | 'info'>('info');
  // Defer push-support checks to the client to avoid SSR/hydration mismatch (#418)
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    async function syncExistingSubscription() {
      if (!isPushSupported()) {
        setSyncing(false);
        return;
      }

      // Pre-warm the SW now so it's ready by the time the user taps the toggle.
      waitForServiceWorker().catch(() => {});

      if (Notification.permission !== 'granted') {
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

        if (!enabled) {
          // The user turned push off (possibly on another device) — respect it.
          return;
        }

        if (subscription) {
          // Refresh this device's row (keys may rotate); other devices are untouched.
          await persistPushSubscription(supabase, user.id, subscription);
        } else {
          // iOS silently drops push subscriptions between sessions — auto-resubscribe there.
          // On desktop the subscription persists, so clearing the DB flag would be wrong.
          // iPadOS reports a Mac user agent, so detect it via touch support.
          const isIOS =
            /iPhone|iPad|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
          if (isIOS) {
            try {
              const newSubscription = await subscribeToPush();
              await persistPushSubscription(supabase, user.id, newSubscription);
              if (!cancelled) {
                onEnabledChange(true);
              }
            } catch {
              // Leave the account-wide setting alone: the user's other devices
              // may still be subscribed. Re-toggling fixes this device.
            }
          }
          // Desktop: leave the toggle as-is — the user can re-enable manually.
        }
      } catch {
        // sync is best-effort on load
      } finally {
        if (!cancelled) setSyncing(false);
      }
    }

    setMounted(true);
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

    // Request permission immediately — must stay close to the user gesture
    // so Chrome doesn't break the gesture context across async boundaries.
    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();

    if (permission !== 'granted') {
      setFeedbackType('error');
      setFeedback(t('pushErrorPermission'));
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
      console.error('[push] subscribe failed:', error);
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

      {mounted && !enabled && !isPushSupported() && (
        <p className="text-xs text-muted-foreground">{t('pushErrorNotSupported')}</p>
      )}

      {mounted && !enabled && isPushSupported() && !isStandalonePwa() && (
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