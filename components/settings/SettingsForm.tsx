'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bell, ChevronDown, Database, Info, Palette, UserRound, type LucideIcon } from 'lucide-react';
import { locales, type Locale } from '@/i18n';
import { createClient } from '@/lib/supabase/client';
import { PushToggle } from '@/components/push/PushToggle';
import { LanguageBadge } from '@/components/layout/LanguagePicker';
import { LANGUAGES } from '@/lib/languages';
import {
  DEFAULT_ANGOL_PUSH_TIME,
  DEFAULT_MAGIA_PUSH_TIME,
  DEFAULT_MAGIA_EVENING_PUSH_TIME,
  DEFAULT_MAGIA_STREAK_PUSH_TIME,
} from '@/lib/locale-meta';
import { AccountDataCard } from '@/components/profile/AccountDataCard';
import { Collapse } from '@/components/ui/collapse';
import { InfoTip } from '@/components/ui/info-tip';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useSwitchLocale } from '@/components/layout/useSwitchLocale';
import { NameCard, type PendingNameChange } from '@/components/profile/NameCard';
import { ThemeTiles } from '@/components/layout/ThemePicker';

interface SettingsData {
  id: string;
  /** Full name in the UI language order */
  name: string;
  first_name: string;
  last_name: string;
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

type Section = 'account' | 'appearance' | 'reminders' | 'data';

/** URL hash of each section (links from notifications, the profile page) */
const SECTION_HASH: Record<Section, string> = {
  account: 'fiok',
  appearance: 'megjelenes',
  reminders: 'emlekeztetok',
  data: 'adataim',
};
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Time inputs save after the user stops changing them for this long. */
const TIME_SAVE_DELAY_MS = 700;

// Debounce timers of pending time-field saves (one settings form at a time)
const pendingSaves = new Map<string, { timer: ReturnType<typeof setTimeout>; run: () => void }>();

interface ReminderRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  time?: string;
  onTimeChange?: (time: string) => void;
  /** The info bubble stays inside this element */
  boundaryRef: React.RefObject<HTMLElement | null>;
}

function ReminderRow({ label, description, checked, onCheckedChange, time, onTimeChange, boundaryRef }: ReminderRowProps) {
  return (
    <div className="flex items-center gap-2 py-2.5">
      <span className="min-w-0 flex-1 text-sm text-cream">{label}</span>
      <InfoTip
        label={description}
        title={label}
        description={description}
        boundaryRef={boundaryRef}
        className="rounded-full p-1 text-muted-foreground/60 transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
        openClassName="text-accent"
      >
        <Info className="h-3.5 w-3.5" />
      </InfoTip>
      {onTimeChange && (
        <Input
          type="time"
          value={time}
          onChange={(e) => e.target.value && onTimeChange(e.target.value)}
          disabled={!checked}
          className="h-8 w-[5.75rem] px-2 text-sm disabled:opacity-40"
        />
      )}
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

export function SettingsForm({
  profile,
  angolAccess = false,
  pendingName = null,
  nextNameChangeAt = null,
}: {
  profile: SettingsData;
  /** Kreatív Angol unlocked by the admin (it also needs the Hungarian UI) */
  angolAccess?: boolean;
  /** Name change waiting for the admin */
  pendingName?: PendingNameChange | null;
  /** ISO date of the next allowed name change (90-day rule), null = now */
  nextNameChangeAt?: string | null;
}) {
  const t = useTranslations('profile');
  const router = useRouter();
  const switchLocale = useSwitchLocale();
  const supabase = createClient();

  const [section, setSection] = useState<Section>('account');

  // Deep links (#emlekeztetok …) and the browser back button
  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.slice(1);
      const match = (Object.keys(SECTION_HASH) as Section[]).find((key) => SECTION_HASH[key] === hash);
      if (match) setSection(match);
    };
    const id = requestAnimationFrame(fromHash);
    window.addEventListener('hashchange', fromHash);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('hashchange', fromHash);
    };
  }, []);

  const openSection = (next: Section) => {
    setSection(next);
    history.replaceState(null, '', `#${SECTION_HASH[next]}`);
  };
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [dangerOpen, setDangerOpen] = useState(false);

  const [testingPush, setTestingPush] = useState(false);
  const [pushTestMessage, setPushTestMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // Leaving the page: save pending time changes right away instead of dropping them
      pendingSaves.forEach(({ timer, run }) => {
        clearTimeout(timer);
        run();
      });
      pendingSaves.clear();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  /** Autosave: writes the changed fields right away and shows "Saved ✓". */
  const saveFields = useCallback(
    async (patch: Record<string, unknown>) => {
      setSaveState('saving');
      const run = (values: Record<string, unknown>) =>
        supabase.from('profiles').update({ ...values, updated_at: new Date().toISOString() }).eq('id', profile.id);
      const { error } = await run(patch);
      if (error) {
        console.error('[profile] autosave failed', error);
        setSaveState('error');
        return;
      }
      setSaveState('saved');
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setSaveState('idle'), 2000);
    },
    [supabase, profile.id]
  );

  const saveLater = (key: string, patch: Record<string, unknown>) => {
    const previous = pendingSaves.get(key);
    if (previous) clearTimeout(previous.timer);
    const run = () => {
      pendingSaves.delete(key);
      void saveFields(patch);
    };
    pendingSaves.set(key, { timer: setTimeout(run, TIME_SAVE_DELAY_MS), run });
  };

  const toggle = (setter: (v: boolean) => void, field: string) => (checked: boolean) => {
    setter(checked);
    void saveFields({ [field]: checked });
  };

  const time = (setter: (v: string) => void, field: string) => (value: string) => {
    setter(value);
    saveLater(field, { [field]: value });
  };

  // Same as the sidebar / account menu: switches the UI and the notification language
  const changeLanguage = (value: string) => {
    setLanguage(value);
    void switchLocale(value as Locale);
  };

  const changePassword = async () => {
    setPasswordMessage(null);
    if (newPassword.length < 8) {
      setPasswordMessage({ ok: false, text: t('passwordTooShort') });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ ok: false, text: t('passwordMismatch') });
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) {
      setPasswordMessage({ ok: false, text: error.message });
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage({ ok: true, text: t('passwordChanged') });
  };

  const sendTestPush = async () => {
    setTestingPush(true);
    setPushTestMessage(null);
    try {
      const res = await fetch('/api/push/test', { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      setPushTestMessage(res.ok ? t('pushTestSent') : typeof data.error === 'string' ? data.error : t('pushTestFailed'));
    } catch {
      setPushTestMessage(t('pushTestFailed'));
    } finally {
      setTestingPush(false);
    }
  };

  const SECTIONS: { id: Section; label: string; icon: LucideIcon }[] = [
    { id: 'account', label: t('tabAccount'), icon: UserRound },
    { id: 'appearance', label: t('tabAppearance'), icon: Palette },
    { id: 'reminders', label: t('tabNotifications'), icon: Bell },
    { id: 'data', label: t('tabData'), icon: Database },
  ];

  return (
    // Mobile: tab bar on top · desktop: section list on the left
    <div className="mx-auto max-w-4xl md:grid md:grid-cols-[13rem_1fr] md:items-start md:gap-8">
      <nav
        data-tip-avoid
        aria-label={t('settingsTitle')}
        className="sticky top-[calc(env(safe-area-inset-top)+3.75rem)] z-20 -mx-1 mb-6 px-1 sm:top-[calc(env(safe-area-inset-top)+4.25rem)] md:top-24 md:mx-0 md:mb-0 md:px-0"
      >
        <div
          className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-border/40 bg-background/80 p-1 backdrop-blur md:flex-col md:overflow-visible md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
          role="tablist"
          aria-orientation="vertical"
        >
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={section === item.id}
              onClick={() => openSection(item.id)}
              className={cn(
                'flex min-w-0 shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all md:justify-start md:py-2.5',
                section === item.id ? 'bg-primary/30 text-accent shadow-sm md:nav-item-active' : 'text-muted-foreground hover:bg-muted/40 hover:text-cream'
              )}
            >
              <item.icon className="hidden h-4 w-4 shrink-0 md:block" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <p
        aria-live="polite"
        className={cn(
          'pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] left-1/2 z-40 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg transition-opacity md:bottom-8',
          saveState === 'idle' ? 'opacity-0' : 'opacity-100',
          saveState === 'error' ? 'bg-red-900/90 text-red-200' : 'bg-card/95 text-accent'
        )}
      >
        {saveState === 'saving' ? t('saving') : saveState === 'error' ? t('saveFailed') : t('savedShort')}
      </p>

      <div key={section} className="min-w-0 animate-fade-up space-y-6 motion-reduce:animate-none">
        {section === 'reminders' && (
          <Card className="premium-card">
            <CardContent ref={notificationsRef} className="space-y-1 pt-6">
              <PushToggle enabled={pushEnabled} onEnabledChange={setPushEnabled} label={t('pushEnabled')} />

              {pushEnabled && (
                <>
                  <p className="pt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">{t('magiaNotificationsTitle')}</p>
                  <div className="divide-y divide-border/30">
                    <ReminderRow
                      boundaryRef={notificationsRef}
                      label={t('morningReminder')}
                      description={t('morningReminderDesc')}
                      checked={magiaReminder}
                      onCheckedChange={toggle(setMagiaReminder, 'push_magia_reminders')}
                      time={magiaTime}
                      onTimeChange={time(setMagiaTime, 'push_magia_time')}
                    />
                    <ReminderRow
                      boundaryRef={notificationsRef}
                      label={t('eveningReminder')}
                      description={t('eveningReminderDesc')}
                      checked={magiaEvening}
                      onCheckedChange={toggle(setMagiaEvening, 'push_magia_evening')}
                      time={magiaEveningTime}
                      onTimeChange={time(setMagiaEveningTime, 'push_magia_evening_time')}
                    />
                    <ReminderRow
                      boundaryRef={notificationsRef}
                      label={t('streakProtector')}
                      description={t('streakProtectorDesc')}
                      checked={magiaStreak}
                      onCheckedChange={toggle(setMagiaStreak, 'push_magia_streak')}
                      time={magiaStreakTime}
                      onTimeChange={time(setMagiaStreakTime, 'push_magia_streak_time')}
                    />
                    <ReminderRow
                      boundaryRef={notificationsRef}
                      label={t('reengagement')}
                      description={t('reengagementDesc')}
                      checked={magiaReengagement}
                      onCheckedChange={toggle(setMagiaReengagement, 'push_magia_reengagement')}
                    />
                  </div>

                  {language === 'hu' && angolAccess && (
                    <>
                      <p className="pt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{t('anglNotificationsTitle')}</p>
                      <ReminderRow
                        boundaryRef={notificationsRef}
                        label={t('angolReminder')}
                        description={t('angolReminderDesc')}
                        checked={angolReminder}
                        onCheckedChange={toggle(setAngolReminder, 'push_angol_reminders')}
                        time={angolTime}
                        onTimeChange={time(setAngolTime, 'push_angol_time')}
                      />
                    </>
                  )}

                  <div className="flex flex-col items-end gap-1 pt-4">
                    <button
                      type="button"
                      onClick={sendTestPush}
                      disabled={testingPush}
                      className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
                    >
                      {testingPush ? t('pushTesting') : t('pushTest')}
                    </button>
                    {pushTestMessage && <p className="text-xs text-muted-foreground">{pushTestMessage}</p>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {section === 'account' && (
          <>
            <NameCard
              firstName={profile.first_name}
              lastName={profile.last_name}
              pending={pendingName}
              nextChangeAt={nextNameChangeAt}
            />

            <Card className="premium-card">
              <button
                type="button"
                onClick={() => setPasswordOpen((v) => !v)}
                aria-expanded={passwordOpen}
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-display text-lg font-semibold text-gradient-gold">{t('changePassword')}</span>
                <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform duration-300', passwordOpen && 'rotate-180')} />
              </button>
              <Collapse open={passwordOpen}>
                <CardContent className="space-y-3">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('newPassword')}
                    aria-label={t('newPassword')}
                    autoComplete="new-password"
                  />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('confirmPassword')}
                    aria-label={t('confirmPassword')}
                    autoComplete="new-password"
                  />
                  <div className="flex items-center justify-between gap-3">
                    {passwordMessage ? (
                      <p className={cn('text-xs', passwordMessage.ok ? 'text-green-400' : 'text-red-400')}>{passwordMessage.text}</p>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={changePassword}
                      disabled={passwordSaving || !newPassword}
                      className="shrink-0 rounded-xl bg-gradient-to-r from-accent-dark via-accent to-accent-light px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-40"
                    >
                      {passwordSaving ? t('saving') : t('passwordSave')}
                    </button>
                  </div>
                </CardContent>
              </Collapse>
            </Card>
          </>
        )}

        {section === 'appearance' && (
          <>
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="text-gradient-gold">{t('appearance')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">{t('appearanceHint')}</p>
                <ThemeTiles />
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="text-gradient-gold">{t('preferredLanguage')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">{t('preferredLanguageHint')}</p>
                <Select value={language} onValueChange={changeLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...locales]
                      .sort((a, b) => LANGUAGES[a].nativeName.localeCompare(LANGUAGES[b].nativeName, language))
                      .map((value) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2">
                            <LanguageBadge code={value} />
                            {LANGUAGES[value].nativeName}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </>
        )}

        {section === 'data' && (
          <>
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="text-gradient-gold">{t('myDataTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <AccountDataCard part="export" userId={profile.id} username={profile.username} email={profile.email} />
              </CardContent>
            </Card>

            <Card className="premium-card border-red-500/15">
              <button
                type="button"
                onClick={() => setDangerOpen((v) => !v)}
                aria-expanded={dangerOpen}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-sm font-semibold text-red-300/80">{t('dangerZone')}</span>
                <ChevronDown className={cn('h-4 w-4 text-red-300/60 transition-transform duration-300', dangerOpen && 'rotate-180')} />
              </button>
              <Collapse open={dangerOpen}>
                <CardContent>
                  <AccountDataCard part="delete" userId={profile.id} username={profile.username} email={profile.email} />
                </CardContent>
              </Collapse>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
