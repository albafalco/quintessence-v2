'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { locales } from '@/i18n';
import { createClient } from '@/lib/supabase/client';
import { PushToggle } from '@/components/push/PushToggle';
import { FlagIcon } from '@/components/ui/FlagIcon';
import {
  DEFAULT_ANGOL_PUSH_TIME,
  DEFAULT_MAGIA_PUSH_TIME,
  DEFAULT_MAGIA_EVENING_PUSH_TIME,
  DEFAULT_MAGIA_STREAK_PUSH_TIME,
} from '@/lib/locale-meta';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProfileData {
  id: string;
  name: string;
  username: string;
  email: string;
  preferred_language: string;
  push_enabled: boolean;
  push_magia_reminders: boolean;
  push_magia_time: string;
  push_magia_evening: boolean;
  push_magia_evening_time: string;
  push_magia_streak: boolean;
  push_magia_streak_time: string;
  push_magia_reengagement: boolean;
  push_angol_reminders: boolean;
  push_angol_time: string;
}

export function ProfileForm({ profile }: { profile: ProfileData }) {
  const t = useTranslations('profile');
  const tLocale = useTranslations('locale');
  const LOCALES = locales.map((value) => ({ value, label: tLocale(value) }));
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(profile.name);
  const [language, setLanguage] = useState(profile.preferred_language);
  const [pushEnabled, setPushEnabled] = useState(profile.push_enabled);
  const [magiaReminder, setMagiaReminder] = useState(profile.push_magia_reminders);
  const [magiaTime, setMagiaTime] = useState(profile.push_magia_time || DEFAULT_MAGIA_PUSH_TIME);
  const [magiaEvening, setMagiaEvening] = useState(profile.push_magia_evening);
  const [magiaEveningTime, setMagiaEveningTime] = useState(profile.push_magia_evening_time || DEFAULT_MAGIA_EVENING_PUSH_TIME);
  const [magiaStreak, setMagiaStreak] = useState(profile.push_magia_streak);
  const [magiaStreakTime, setMagiaStreakTime] = useState(profile.push_magia_streak_time || DEFAULT_MAGIA_STREAK_PUSH_TIME);
  const [magiaReengagement, setMagiaReengagement] = useState(profile.push_magia_reengagement);
  const [angolReminder, setAngolReminder] = useState(profile.push_angol_reminders);
  const [angolTime, setAngolTime] = useState(profile.push_angol_time || DEFAULT_ANGOL_PUSH_TIME);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [pushTestMessage, setPushTestMessage] = useState<string | null>(null);

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        name,
        preferred_language: language,
        push_magia_reminders: magiaReminder,
        push_magia_time: magiaTime,
        push_magia_evening: magiaEvening,
        push_magia_evening_time: magiaEveningTime,
        push_magia_streak: magiaStreak,
        push_magia_streak_time: magiaStreakTime,
        push_magia_reengagement: magiaReengagement,
        push_angol_reminders: angolReminder,
        push_angol_time: angolTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        setError(t('passwordTooShort'));
        setSaving(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError(t('passwordMismatch'));
        setSaving(false);
        return;
      }
      const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
      if (pwError) {
        setError(pwError.message);
        setSaving(false);
        return;
      }
      setNewPassword('');
      setConfirmPassword('');
    }

    setMessage(t('saved'));
    setSaving(false);
    router.refresh();
  };

  const sendTestPush = async () => {
    setTestingPush(true);
    setPushTestMessage(null);

    try {
      const res = await fetch('/api/push/test', { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPushTestMessage(typeof data.error === 'string' ? data.error : t('pushTestFailed'));
        return;
      }

      setPushTestMessage(t('pushTestSent'));
    } catch {
      setPushTestMessage(t('pushTestFailed'));
    } finally {
      setTestingPush(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-gradient-gold">{t('personalData')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">{t('name')}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t('username')}</Label>
            <Input value={profile.username} disabled className="opacity-60" />
            <p className="mt-1 text-xs text-muted-foreground">{t('readonly')}</p>
          </div>
          <div>
            <Label>{t('email')}</Label>
            <Input value={profile.email} disabled className="opacity-60" />
            <p className="mt-1 text-xs text-muted-foreground">{t('readonly')}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-gradient-gold">{t('appearance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Label>{t('preferredLanguage')}</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCALES.map((loc) => (
                <SelectItem key={loc.value} value={loc.value}>
                  <span className="flex items-center gap-2">
                    <FlagIcon locale={loc.value} className="h-3.5 w-5" />
                    {loc.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-gradient-gold">{t('pushNotifications')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PushToggle
            enabled={pushEnabled}
            onEnabledChange={setPushEnabled}
            label={t('pushEnabled')}
          />

          {pushEnabled && (
            <>
              <Separator />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">{t('pushTestHint')}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={sendTestPush}
                  disabled={testingPush}
                >
                  {testingPush ? t('pushTesting') : t('pushTest')}
                </Button>
              </div>
              {pushTestMessage && (
                <p className="text-xs text-accent">{pushTestMessage}</p>
              )}
              <p className="text-xs font-semibold uppercase tracking-wider text-accent/60">{t('magiaNotificationsTitle')}</p>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('morningReminder')}</Label>
                  <p className="text-[11px] text-muted-foreground">{t('morningReminderDesc')}</p>
                </div>
                <Switch checked={magiaReminder} onCheckedChange={setMagiaReminder} />
              </div>
              {magiaReminder && (
                <div>
                  <Label>{t('reminderTime')}</Label>
                  <Input
                    type="time"
                    value={magiaTime}
                    onChange={(e) => setMagiaTime(e.target.value)}
                    className="mt-1 w-40"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('eveningReminder')}</Label>
                  <p className="text-[11px] text-muted-foreground">{t('eveningReminderDesc')}</p>
                </div>
                <Switch checked={magiaEvening} onCheckedChange={setMagiaEvening} />
              </div>
              {magiaEvening && (
                <div>
                  <Label>{t('reminderTime')}</Label>
                  <Input
                    type="time"
                    value={magiaEveningTime}
                    onChange={(e) => setMagiaEveningTime(e.target.value)}
                    className="mt-1 w-40"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('streakProtector')}</Label>
                  <p className="text-[11px] text-muted-foreground">{t('streakProtectorDesc')}</p>
                </div>
                <Switch checked={magiaStreak} onCheckedChange={setMagiaStreak} />
              </div>
              {magiaStreak && (
                <div>
                  <Label>{t('reminderTime')}</Label>
                  <Input
                    type="time"
                    value={magiaStreakTime}
                    onChange={(e) => setMagiaStreakTime(e.target.value)}
                    className="mt-1 w-40"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('reengagement')}</Label>
                  <p className="text-[11px] text-muted-foreground">{t('reengagementDesc')}</p>
                </div>
                <Switch checked={magiaReengagement} onCheckedChange={setMagiaReengagement} />
              </div>

              {language === 'hu' && (
                <>
                  <Separator />
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent/60">{t('anglNotificationsTitle')}</p>
                  <div className="flex items-center justify-between">
                    <Label>{t('angolReminder')}</Label>
                    <Switch checked={angolReminder} onCheckedChange={setAngolReminder} />
                  </div>
                  {angolReminder && (
                    <div>
                      <Label>{t('reminderTime')}</Label>
                      <Input
                        type="time"
                        value={angolTime}
                        onChange={(e) => setAngolTime(e.target.value)}
                        className="mt-1 w-40"
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-gradient-gold">{t('changePassword')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="newPassword">{t('newPassword')}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-green-400">{message}</p>}

      <Button variant="gold" onClick={saveProfile} disabled={saving} className="w-full">
        {saving ? '...' : t('save')}
      </Button>

      <Card className="premium-card border-red-500/10">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t('logoutHint')}</p>
          <LogoutButton variant="outline" className="w-full sm:w-auto" />
        </CardContent>
      </Card>
    </div>
  );
}