import type { SupabaseClient } from '@supabase/supabase-js';

const BUDAPEST_TZ = 'Europe/Budapest';
export const PUSH_CRON_WINDOW_MINUTES = 5;

export interface BudapestNow {
  date: string;
  hour: number;
  minute: number;
  totalMinutes: number;
}

export function getBudapestNow(date = new Date()): BudapestNow {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUDAPEST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00';

  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = parseInt(get('hour'), 10);
  const minute = parseInt(get('minute'), 10);

  return {
    date: `${year}-${month}-${day}`,
    hour,
    minute,
    totalMinutes: hour * 60 + minute,
  };
}

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map((value) => parseInt(value, 10));
  return hours * 60 + minutes;
}

export function isReminderDue(
  nowMinutes: number,
  targetTime: string,
  windowMinutes = PUSH_CRON_WINDOW_MINUTES
): boolean {
  const targetMinutes = parseTimeToMinutes(targetTime);
  return nowMinutes >= targetMinutes && nowMinutes < targetMinutes + windowMinutes;
}

function budapestLocalToIso(
  date: string,
  hours: number,
  minutes: number,
  seconds: number,
  milliseconds: number
): string {
  const [year, month, day] = date.split('-').map((value) => parseInt(value, 10));
  let utcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds, milliseconds);

  for (let attempt = 0; attempt < 2; attempt++) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: BUDAPEST_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date(utcMs));

    const read = (type: Intl.DateTimeFormatPartTypes) =>
      parseInt(parts.find((part) => part.type === type)?.value ?? '0', 10);

    const actualUtc = Date.UTC(
      read('year'),
      read('month') - 1,
      read('day'),
      read('hour'),
      read('minute'),
      read('second')
    );

    const desiredUtc = Date.UTC(year, month - 1, day, hours, minutes, seconds);
    utcMs += desiredUtc - actualUtc;
  }

  return new Date(utcMs).toISOString();
}

export function getBudapestDayBounds(date: string): { start: string; end: string } {
  return {
    start: budapestLocalToIso(date, 0, 0, 0, 0),
    end: budapestLocalToIso(date, 23, 59, 59, 999),
  };
}

export async function hasAngolActivityToday(
  supabase: SupabaseClient,
  userId: string,
  budapestDate: string
): Promise<boolean> {
  const { start, end } = getBudapestDayBounds(budapestDate);

  const [{ data: cards }, { data: exams }] = await Promise.all([
    supabase
      .from('angol_card_progress')
      .select('id')
      .eq('user_id', userId)
      .gte('last_seen', start)
      .lte('last_seen', end)
      .limit(1),
    supabase
      .from('angol_exam_results')
      .select('id')
      .eq('user_id', userId)
      .gte('taken_at', start)
      .lte('taken_at', end)
      .limit(1),
  ]);

  return Boolean(cards?.length || exams?.length);
}