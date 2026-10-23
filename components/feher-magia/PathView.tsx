import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { FeherMagiaContent } from '@/lib/i18n-content';
import type { PathData } from '@/lib/magia/path-store';
import {
  THOUGHT_MAX_MINUTES,
  THOUGHT_WINS_TO_ADVANCE,
  UNLOCK_BREATH_AFTER,
  UNLOCK_MEAL_WATER_AFTER,
  fokozatIConditions,
  unlockedExercises,
} from '@/lib/magia/path';
import { ROMAN_NUMERALS } from '@/lib/magia-utils';
import { AppIcon } from '@/components/ui/AppIcon';
import { cn } from '@/lib/utils';
import { UtravaloShelf, type ShelfItem } from './UtravaloShelf';

type PathContent = Pick<FeherMagiaContent, 'utravalo' | 'thought' | 'source' | 'elements' | 'fokozatok'>;

function Check({ done }: { done: boolean }) {
  return (
    <span
      className={cn(
        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]',
        done ? 'border-accent bg-accent text-accent-foreground' : 'border-muted-foreground/40'
      )}
      aria-hidden
    >
      {done ? '✓' : ''}
    </span>
  );
}

/** The Utam tab: where the I. fokozat stands, the Útravalók, the next fokozatok. */
export async function PathView({ locale, data, content }: { locale: string; data: PathData; content: PathContent }) {
  const [t, tPath] = await Promise.all([getTranslations('feherMagia.utam'), getTranslations('feherMagia')]);
  const { day } = data;
  const { path } = day;
  const stage = path.thought_stage;
  const { conditions, allDone, percent } = fokozatIConditions({
    gateRead: Boolean(path.gate_read_at),
    thoughtStage: stage,
    thoughtMinutes: path.thought_minutes,
    thoughtWins: path.thought_wins,
    closedCycles: day.closedCycles,
    openCycleDays: day.openCycle?.days,
    openCycleLength: day.openCycle?.length,
  });
  const [gate, thought, cycles] = conditions;
  const stageNames = content.thought.stages.map((s) => s.name);
  const unlocked = unlockedExercises(day.completedEvenings);

  // The readings in the order of the path; the ones not reached yet stay closed
  const lockedHint: Partial<Record<keyof PathContent['utravalo'], string | undefined>> = {
    fegyelmezes: stage < 1 ? t('lockedStage', { n: 2 }) : undefined,
    uresseg: stage < 2 ? t('lockedStage', { n: 3 }) : undefined,
    legzes: unlocked.breath ? undefined : t('lockedDay', { day: UNLOCK_BREATH_AFTER + 1 }),
    etkezes: unlocked.mealWater ? undefined : t('lockedDay', { day: UNLOCK_MEAL_WATER_AFTER + 1 }),
    viz: unlocked.mealWater ? undefined : t('lockedDay', { day: UNLOCK_MEAL_WATER_AFTER + 1 }),
  };
  const shelf: ShelfItem[] = (Object.keys(content.utravalo) as (keyof PathContent['utravalo'])[]).map((key) => ({
    key,
    page: content.utravalo[key],
    lockedHint: lockedHint[key],
  }));

  const [first, ...next] = content.fokozatok;

  return (
    // Wide screens: the fokozatok on the left, the Útravalók on the right
    <div className="space-y-6 xl:grid xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start xl:gap-6 xl:space-y-0">
      {/* The I. fokozat */}
      <section className="premium-card magia-surface space-y-4 p-5 sm:p-6 xl:col-start-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-cream">{tPath('header.fokozat', { roman: ROMAN_NUMERALS[path.fokozat] })}</h2>
            <p className="text-xs text-muted-foreground">{first?.theme}</p>
          </div>
          <p className="font-display text-3xl font-bold tabular-nums text-gradient-gold">{percent}%</p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-dark via-accent to-accent-light"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">{t('conditionsTitle')}</p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <Check done={gate.done} />
              <span className="flex-1 text-cream">{t('gate')}</span>
              <Link href={`/${locale}/modules/magia/kapu`} className="text-xs font-semibold text-accent hover:underline">
                {t('gateReread')}
              </Link>
            </li>
            <li className="flex gap-3">
              <Check done={thought.done} />
              <span className="flex-1">
                <span className="text-cream">{t('thought')}</span>
                {!thought.done && (
                  <span className="block text-xs text-muted-foreground">
                    {path.thought_minutes >= THOUGHT_MAX_MINUTES
                      ? t('thoughtWins', { stage: stageNames[stage], wins: Math.min(path.thought_wins, THOUGHT_WINS_TO_ADVANCE) })
                      : t('thoughtNow', { stage: stageNames[stage], minutes: path.thought_minutes })}
                  </span>
                )}
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  {stageNames.map((name, i) => (
                    <span
                      key={name}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[11px]',
                        i < stage ? 'border-accent/40 bg-accent/10 text-accent' : i === stage ? 'border-border/60 text-cream' : 'border-border/30 text-muted-foreground'
                      )}
                    >
                      {i < stage && '✓ '}
                      {name}
                    </span>
                  ))}
                </span>
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{t('count', { value: thought.value, target: thought.target })}</span>
            </li>
            <li className="flex gap-3">
              <Check done={cycles.done} />
              <span className="flex-1">
                <span className="text-cream">{t('cycles')}</span>
                {!cycles.done && day.openCycle && (
                  <span className="block text-xs text-muted-foreground">
                    {t('cyclesNow', { days: Math.min(day.openCycle.days, day.openCycle.length), length: day.openCycle.length })}
                  </span>
                )}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{t('count', { value: cycles.value, target: cycles.target })}</span>
            </li>
          </ul>
        </div>

        {allDone && <p className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2.5 text-sm text-cream">{t('allDone')}</p>}
        <p className="text-xs leading-relaxed text-muted-foreground">{t('habits')}</p>

        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            [day.completedEvenings, t('statDays')],
            [data.streak, t('statStreak')],
            [day.closedCycles, t('statCycles')],
          ].map(([value, label]) => (
            <div key={String(label)} className="rounded-xl border border-border/40 bg-background/30 px-2 py-2.5">
              <dt className="sr-only">{label}</dt>
              <dd className="font-display text-xl font-bold tabular-nums text-cream">{value}</dd>
              <dd className="text-[11px] text-muted-foreground">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Útravalók */}
      <section className="space-y-3 xl:col-start-2 xl:row-span-2 xl:row-start-1">
        <div>
          <h2 className="font-display text-lg font-semibold text-cream">{t('utravaloTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('utravaloHint')}</p>
        </div>
        <UtravaloShelf locale={locale} items={shelf} source={content.source} />
      </section>

      {/* The II. and III. fokozat: a closed preview */}
      <section className="space-y-3 xl:col-start-1">
        <h2 className="font-display text-lg font-semibold text-cream">{t('nextTitle')}</h2>
        {next.map((f, i) => (
          <article key={f.theme} className="rounded-2xl border border-dashed border-border/50 bg-card/20 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-cream/80">{tPath('header.fokozat', { roman: ROMAN_NUMERALS[i + 2] })}</h3>
                <p className="text-xs text-muted-foreground">{f.theme}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                <AppIcon name="lock" className="h-3 w-3" />
                {t('locked')}
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {f.items?.map((item) => (
                <li key={item.name} className="text-sm">
                  <span className="text-cream/80">{item.name}</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">{item.text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs italic text-accent/70">{i === 0 ? t('opens2') : t('opens3')}</p>
          </article>
        ))}
      </section>

      <p className="text-center text-xs italic text-muted-foreground xl:col-span-2">{t('source', { source: content.source })}</p>
    </div>
  );
}
