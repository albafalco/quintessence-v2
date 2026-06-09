'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

interface PushToggleProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  label: string;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushToggle({ enabled, onEnabledChange, label }: PushToggleProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleToggle = async (checked: boolean) => {
    if (!checked) {
      onEnabledChange(false);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
        await supabase.from('profiles').update({ push_enabled: false }).eq('id', user.id);
      }
      return;
    }

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        onEnabledChange(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error('VAPID key missing');

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subJson = subscription.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      if (!res.ok) throw new Error('Subscribe failed');
      onEnabledChange(true);
    } catch {
      onEnabledChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <Label htmlFor="push-toggle">{label}</Label>
      <Switch
        id="push-toggle"
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={loading}
      />
    </div>
  );
}