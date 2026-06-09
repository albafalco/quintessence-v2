'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import {
  isPushSupported,
  isStandalonePwa,
  subscribeToPush,
} from '@/lib/push-client';
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
  if (message.includes('Subscribe failed')) return t('pushErrorSubscribe');

  return t('pushErrorGeneric');
}

export function PushToggle({ enabled, onEnabledChange, label }: PushToggleProps) {
  const t = useTranslations('profile');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'error' | 'success' | 'info'>('info');
  const supabase = createClient();

  const handleToggle = async (checked: boolean) => {
    setFeedback(null);

    if (!checked) {
      onEnabledChange(false);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
        await supabase.from('profiles').update({ push_enabled: false }).eq('id', user.id);
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
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setFeedbackType('error');
        setFeedback(t('pushErrorPermission'));
        onEnabledChange(false);
        return;
      }

      const subscription = await subscribeToPush();
      const subJson = subscription.toJSON();

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === 'string' ? `Subscribe failed: ${data.error}` : 'Subscribe failed'
        );
      }

      onEnabledChange(true);
      setFeedbackType('success');
      setFeedback(t('pushSuccess'));

      const testRes = await fetch('/api/push/test', { method: 'POST' });
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
          disabled={loading}
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