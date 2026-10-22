'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { createClient } from '@/lib/supabase/client';
import {
  isPushSupported,
  isStandalonePwa,
  subscribeToPush,
  waitForServiceWorker,
} from '@/lib/push-client';
import {
  clearPushSubscription,
  countPushSubscriptions,
  disableCurrentDevicePush,
  persistPushSubscription,
} from '@/lib/push-subscription';
import { cn } from '@/lib/utils';

interface PushToggleProps {
  /** Account-wide flag: at least one device is subscribed */
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  label: string;
}

/**
 * Remembers whether push was turned on *on this device* ('1') or off ('0').
 * Used to auto-resubscribe on iOS, which silently drops subscriptions.
 */
const DEVICE_FLAG_KEY = 'quintessence-push-device';

export function readDeviceFlag(): string | null {
  try {
    return localStorage.getItem(DEVICE_FLAG_KEY);
  } catch {
    return null;
  }
}

export function writeDeviceFlag(on: boolean) {
  try {
    localStorage.setItem(DEVICE_FLAG_KEY, on ? '1' : '0');
  } catch {
    // storage unavailable (private mode) — only the iOS auto-resubscribe is affected
  }
}

export function mapPushError(error: unknown, t: (key: string) => string): string {
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

/**
 * Push on/off for *this device*. Each device subscribes separately; turning it
 * off here leaves the user's other devices subscribed.
 */
export function PushToggle({ enabled, onEnabledChange, label }: PushToggleProps) {
  const t = useTranslations('profile');
  const { confirm, confirmDialog } = useConfirm();
  const [deviceOn, setDeviceOn] = useState(false);
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'error' | 'success' | 'info'>('info');
  // Defer push-support checks to the client to avoid SSR/hydration mismatch (#418)
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  const refreshCount = async (userId: string) => {
    try {
      const count = await countPushSubscriptions(supabase, userId);
      setDeviceCount(count);
      onEnabledChange(count > 0);
    } catch {
      // the count is informational only
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function syncThisDevice() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        if (isPushSupported()) {
          // Pre-warm the SW now so it's ready by the time the user taps the toggle.
          waitForServiceWorker().catch(() => {});
        }

        if (isPushSupported() && Notification.permission === 'granted') {
          const registration = await waitForServiceWorker();
          const subscription = await registration.pushManager.getSubscription();
          const flag = readDeviceFlag();

          if (subscription && flag !== '0') {
            // Refresh this device's row (keys may rotate); other devices are untouched.
            await persistPushSubscription(supabase, user.id, subscription);
            if (!cancelled) setDeviceOn(true);
          } else if (!subscription) {
            // iOS silently drops push subscriptions between sessions — resubscribe
            // if push was on here (no flag yet: devices set up before per-device
            // toggles, recognised by the account-wide flag).
            // iPadOS reports a Mac user agent, so detect it via touch support.
            const isIOS =
              /iPhone|iPad|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            if (isIOS && (flag === '1' || (flag === null && enabled))) {
              try {
                const newSubscription = await subscribeToPush();
                await persistPushSubscription(supabase, user.id, newSubscription);
                writeDeviceFlag(true);
                if (!cancelled) setDeviceOn(true);
              } catch {
                // Re-toggling fixes this device.
              }
            }
          }
        }

        if (!cancelled) await refreshCount(user.id);
      } catch {
        // sync is best-effort on load
      } finally {
        if (!cancelled) setSyncing(false);
      }
    }

    setMounted(true);
    syncThisDevice();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (checked: boolean) => {
    setFeedback(null);

    if (!checked) {
      setLoading(true);
      setDeviceOn(false);
      writeDeviceFlag(false);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const remaining = await disableCurrentDevicePush(supabase, user.id);
          setDeviceCount(remaining);
          onEnabledChange(remaining > 0);
        }
      } catch {
        // ignore unsubscribe errors
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!isPushSupported()) {
      setFeedbackType('error');
      setFeedback(t('pushErrorNotSupported'));
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
      writeDeviceFlag(true);
      setDeviceOn(true);
      await refreshCount(user.id);
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
      setDeviceOn(false);
    } finally {
      setLoading(false);
    }
  };

  const disableEverywhere = async () => {
    const ok = await confirm({
      message: t('pushDisableAllConfirm'),
      confirmLabel: t('pushDisableAll'),
      cancelLabel: t('cancel'),
      destructive: true,
    });
    if (!ok) return;
    setLoading(true);
    setFeedback(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await clearPushSubscription(supabase, user.id);
        try {
          const registration = await navigator.serviceWorker.getRegistration('/');
          await (await registration?.pushManager.getSubscription())?.unsubscribe();
        } catch {
          // ignore unsubscribe errors
        }
        writeDeviceFlag(false);
        setDeviceOn(false);
        setDeviceCount(0);
        onEnabledChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const otherDevices = deviceCount !== null ? Math.max(0, deviceCount - (deviceOn ? 1 : 0)) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="push-toggle">{label}</Label>
        <Switch
          id="push-toggle"
          checked={deviceOn}
          onCheckedChange={handleToggle}
          disabled={loading || syncing}
        />
      </div>

      {deviceCount !== null && deviceCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('pushDeviceCount', { count: deviceCount })}
          {otherDevices > 0 && (
            <>
              {' · '}
              <button
                type="button"
                onClick={() => void disableEverywhere()}
                disabled={loading}
                className="font-medium text-red-300/80 hover:underline disabled:opacity-50"
              >
                {t('pushDisableAll')}
              </button>
            </>
          )}
        </p>
      )}

      {mounted && !deviceOn && !isPushSupported() && (
        <p className="text-xs text-muted-foreground">{t('pushErrorNotSupported')}</p>
      )}

      {mounted && !deviceOn && isPushSupported() && !isStandalonePwa() && (
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
      {confirmDialog}
    </div>
  );
}
