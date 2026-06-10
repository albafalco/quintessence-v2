'use client';

import { useTranslations } from 'next-intl';
import type { DailyHeatmapEntry } from '@/lib/magia-utils';

interface StreakCalendarProps {
  data: DailyHeatmapEntry[];
  streak: number;
}

function getIntensityClass(totalSec: number): string {
  if (totalSec === 0) return 'bg-muted/30';
  if (totalSec < 300) return 'bg-accent/20';
  if (totalSec < 900) return 'bg-accent/40';
  if (totalSec < 1800) return 'bg-accent/65';
  return 'bg-accent shadow-glow-gold';
}

export function StreakCalendar({ data, streak }: StreakCalendarProps) {
  const t = useTranslations('magia');

  const DAYS = [
    t('calendarDayH'),
    t('calendarDayK'),
    t('calendarDaySz'),
    t('calendarDayCs'),
    t('calendarDayP'),
    t('calendarDaySzo'),
    t('calendarDayV'),
  ];

  const firstDayOfWeek = data.length > 0
    ? new Date(data[0].date + 'T00:00:00Z').getDay()
    : 0;
  const adjustedFirst = (firstDayOfWeek + 6) % 7;

  const padded = [
    ...Array(adjustedFirst).fill(null),
    ...data,
  ];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00Z');
    return t('calendarDateFormat', { month: d.getMonth() + 1, day: d.getDate() });
  };

  const formatMin = (sec: number) => {
    const m = Math.floor(sec / 60);
    return m > 0 ? `${m} ${t('calendarMinutes')}` : '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-accent/70">
          {t('calendarTitle')}
        </h3>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl bg-accent/10 px-3 py-1 text-sm font-bold text-accent shadow-glow-gold">
            🔥 {streak} {t('calendarStreak')}
          </div>
        )}
      </div>

      {/* Napok fejléce */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS.map((d, i) => (
          <div key={i} className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            {d}
          </div>
        ))}
      </div>

      {/* Hőtérkép */}
      <div className="grid grid-cols-7 gap-1">
        {padded.map((entry, i) => {
          if (!entry) {
            return <div key={`pad-${i}`} className="h-7 rounded-md" />;
          }
          return (
            <div
              key={entry.date}
              title={`${formatDate(entry.date)}${entry.totalSec > 0 ? ` — ${formatMin(entry.totalSec)}` : ''}`}
              className={`h-7 rounded-md transition-all ${getIntensityClass(entry.totalSec)} cursor-default`}
            />
          );
        })}
      </div>

      {/* Jelmagyarázat */}
      <div className="flex items-center gap-2 justify-end">
        <span className="text-[9px] text-muted-foreground/60">{t('calendarLess')}</span>
        {[0, 300, 900, 1800, 3600].map((v, i) => (
          <div key={i} className={`h-3 w-3 rounded-sm ${getIntensityClass(v)}`} />
        ))}
        <span className="text-[9px] text-muted-foreground/60">{t('calendarMore')}</span>
      </div>
    </div>
  );
}
