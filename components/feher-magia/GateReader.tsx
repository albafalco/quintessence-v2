'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { isPushSupported, subscribeToPush } from '@/lib/push-client';
import { persistPushSubscription } from '@/lib/push-subscription';
import { mapPushError, writeDeviceFlag } from '@/components/push/PushToggle';
import { Switch } from '@/components/ui/switch';
import type { ReadingPage } from '@/lib/i18n-content';
import { Prose } from './Prose';

interface GateReaderProps {
  locale: string;
  userId: string;
  pages: ReadingPage[];
  source: string;
  timeQuote: string;
  /** Already read: only the reading, no settings */
  readOnly: boolean;
  initialMorning: string;
  initialEvening: string;
  initialReminder: boolean;
}

function timeOptions(fromMin: number, toMin: number): string[] {
  const out: string[] = [];
  for (let m = fromMin; m <= toMin; m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}

const MORNING_TIMES = timeOptions(5 * 60, 10 * 60);
const EVENING_TIMES = timeOptions(18 * 60, 23 * 60 + 30);

/** "A kapu": the 189th page once, then the practice times and the reminder switch. */
export function GateReader({
  locale,
  userId,
  pages,
  source,
  timeQuote,
  readOnly,
  initialMorning,
  initialEvening,
  initialReminder,
}: GateReaderProps) {
  const t = useTranslations('feherMagia.gate');
  const tProfile = useTranslations('profile');
  const router = useRouter();
  const total = readOnly ? pages.length : pages.length + 1;
  const [index, setIndex] = useState(0);
  const [morning, setMorning] = useState(MORNING_TIMES.includes(initialMorning) ? initialMorning : '06:30');
  const [evening, setEvening] = useState(EVENING_TIMES.includes(initialEvening) ? initialEvening : '21:30');
  const [reminder, setReminder] = useState(initialReminder);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const toToday = () => {
    router.push(`/${locale}/modules/magia/ma`);
    router.refresh();
  };

  // Ask for permission right on the tap (browsers want it inside the gesture)
  const toggleReminder = async (on: boolean) => {
    setError(null);
    if (!on) {
      setReminder(false);
      return;
    }
    if (!isPushSupported()) {
      setError(tProfile('pushErrorNotSupported'));
      return;
    }
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') {
      setError(tProfile('pushErrorPermission'));
      return;
    }
    setReminder(true);
    try {
      const supabase = createClient();
      const subscription = await subscribeToPush();
      await persistPushSubscription(supabase, userId, subscription);
      writeDeviceFlag(true);
    } catch (err) {
      setReminder(false);
      setError(mapPushError(err, tProfile));
    }
  };

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const now = new Date().toISOString();
      const { error: pathError } = await supabase
        .from('magia_path')
        .upsert({ user_id: userId, gate_read_at: now, updated_at: now }, { onConflict: 'user_id' });
      if (pathError) throw pathError;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          push_magia_time: morning,
          push_magia_evening_time: evening,
          push_magia_reminders: reminder,
          push_magia_evening: reminder,
          updated_at: now,
        })
        .eq('id', userId);
      if (profileError) throw profileError;
      setDone(true);
    } catch (err) {
      console.error('[magia] gate save failed', err);
      setError(t('saveError'));
    } finally {
      setBusy(false);
    }
  };

  const primary =
    'rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/30 hover:shadow-glow-gold disabled:opacity-50';
  const secondary = 'rounded-xl border border-border/50 px-4 py-3 text-sm font-medium text-cream transition hover:border-accent/40';

  if (done) {
    return (
      <section className="premium-card magia-surface flex flex-col gap-4 p-6 text-center">
        <h2 className="font-display text-2xl font-semibold text-gradient-gold">{t('startedTitle')}</h2>
        <p className="text-sm text-cream/90">{t('startedBody', { morning, evening })}</p>
        <p className="text-sm text-muted-foreground">{reminder ? t('reminderOn') : t('reminderOff')}</p>
        <p className="text-sm italic text-muted-foreground">{t('quote')}</p>
        <p className="text-sm text-cream/90">{t('startedNow')}</p>
        <button type="button" onClick={toToday} className={primary}>
          {t('toToday')}
        </button>
      </section>
    );
  }

  const page = pages[index];
  const onLast = index === total - 1;

  return (
    <section className="premium-card magia-surface flex flex-col gap-5 p-5 sm:p-7">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-[0.18em] text-accent/70">{t('title')}</span>
        <span className="tabular-nums">{t('page', { n: index + 1, total })}</span>
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-accent' : 'bg-muted/40'}`} />
        ))}
      </div>

      {page ? (
        <article className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-semibold text-gradient-gold">{page.title}</h2>
          <Prose paragraphs={page.paragraphs} />
          <p className="text-right text-xs italic text-muted-foreground">{source}</p>
        </article>
      ) : (
        <article className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-semibold text-gradient-gold">{t('whenTitle')}</h2>
          <p className="text-sm italic text-muted-foreground">„{timeQuote}”</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('morning')}
              <select
                value={morning}
                onChange={(e) => setMorning(e.target.value)}
                className="rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-base text-cream"
              >
                {MORNING_TIMES.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('evening')}
              <select
                value={evening}
                onChange={(e) => setEvening(e.target.value)}
                className="rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-base text-cream"
              >
                {EVENING_TIMES.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-background/40 px-4 py-3">
            <span>
              <span className="block text-sm font-semibold text-cream">{t('reminder')}</span>
              <span className="block text-xs text-muted-foreground">{t('reminderDesc', { morning, evening })}</span>
            </span>
            <Switch checked={reminder} onCheckedChange={toggleReminder} aria-label={t('reminder')} />
          </label>
          {reminder && <p className="text-xs text-muted-foreground">{t('reminderPermission')}</p>}
          <p className="text-xs text-muted-foreground">{t('timeNote')}</p>
        </article>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        {index > 0 && (
          <button type="button" onClick={() => setIndex((i) => i - 1)} className={`flex-1 ${secondary}`}>
            {t('back')}
          </button>
        )}
        {!onLast && (
          <button type="button" onClick={() => setIndex((i) => i + 1)} className={`flex-1 ${primary}`}>
            {t('next')}
          </button>
        )}
        {onLast && readOnly && (
          <button type="button" onClick={toToday} className={`flex-1 ${primary}`}>
            {t('toToday')}
          </button>
        )}
        {onLast && !readOnly && (
          <button type="button" onClick={start} disabled={busy} className={`flex-1 ${primary}`}>
            {busy ? t('saving') : t('start')}
          </button>
        )}
      </div>
    </section>
  );
}
