'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ElementType } from '@/lib/magia-types';
import type { FeherMagiaContent, ReadingPage } from '@/lib/i18n-content';
import { getBudapestDayBounds } from '@/lib/push-reminders';
import {
  DAY_STARTS_AT_HOUR,
  SESSION_KEYS,
  UNLOCK_BREATH_AFTER,
  UNLOCK_MEAL_WATER_AFTER,
  bodyItemsFor,
  breathTargetFor,
  dayTasks,
  isThoughtKey,
  slotOf,
  unlockedExercises,
} from '@/lib/magia/path';
import { TRAITS, TRAIT_BY_KEY } from '@/lib/magia/traits';
import { isCycleReady, summarize } from '@/lib/magia/mirror';
import { addedKey, markedCounts, mirrorTraits, searchEntries, traitName, type AddedTrait, type TraitWords } from '@/lib/magia/evening';
import type { CycleRow, EveningRow, TodayData, TodaySession } from '@/lib/magia/store';
import type { BodyItem, BreathState, DayPart, PathState, Ratings, ThoughtState } from '@/lib/magia/types';
import {
  addDayNote,
  addUserTrait,
  closeCycle,
  deleteSessionsSince,
  openCycle,
  saveEvening,
  saveSession,
  updatePath,
} from '@/lib/magia/actions';
import { AppIcon } from '@/components/ui/AppIcon';
import { cn } from '@/lib/utils';
import { BodyChecklist } from './BodyChecklist';
import { BodySetup } from './BodySetup';
import { BreathPractice } from './BreathPractice';
import { EveningCards } from './EveningCards';
import { HabitStep, SleepStep } from './EveningSteps';
import { FlowShell } from './FlowShell';
import { RecallStep } from './RecallStep';
import { ThoughtPractice, type ThoughtSaved } from './ThoughtPractice';
import { TraitPicker, type TraitPick } from './TraitPicker';
import { UtravaloView } from './UtravaloView';

type Step = 'setup' | 'body' | 'thought' | 'breath' | 'meal' | 'water' | 'recall' | 'cards' | 'add' | 'sleep';
type FlowState = { part: DayPart; step: Step | 'done'; skipped: Step[]; introRead?: boolean };

export type TodayContent = Pick<FeherMagiaContent, 'utravalo' | 'thought' | 'wishes' | 'body' | 'source' | 'elements' | 'sleep'>;

interface TodayViewProps {
  locale: string;
  userId: string;
  data: TodayData;
  content: TodayContent;
  /** Trait texts by key (tulajdonsagok.<locale>.json) */
  words: Record<string, TraitWords>;
  /** Open the "+" note right away (the dashboard's quick button) */
  openNote?: boolean;
  /** ?este=1 (the evening reminder): the evening starts right away */
  openEvening?: boolean;
}

const PARTS: DayPart[] = ['reggel', 'napkozben', 'este'];
const THOUGHT_PAGES = ['gondolat', 'fegyelmezes', 'uresseg'] as const;

/** The "Ma" tab: morning, day and evening, each started with one button. */
export function TodayView({ locale, userId, data, content, words, openNote = false, openEvening = false }: TodayViewProps) {
  const t = useTranslations('feherMagia');
  const router = useRouter();
  const [path, setPath] = useState<PathState>(data.path);
  const [sessions, setSessions] = useState<TodaySession[]>(data.sessions);
  const [seen, setSeen] = useState(data.seen);
  const [evening, setEvening] = useState<EveningRow | null>(data.evening);
  const [cycle, setCycle] = useState<CycleRow | null>(data.cycle);
  const [userTraits, setUserTraits] = useState<AddedTrait[]>(data.userTraits);
  const [noteKeys, setNoteKeys] = useState<string[]>(data.noteKeys);
  const [completedEvenings, setCompletedEvenings] = useState(data.completedEvenings);
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [reading, setReading] = useState<ReadingPage | null>(null);
  const [noting, setNoting] = useState(openNote);
  const [busy, setBusy] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const today = data.today;

  const unlocked = unlockedExercises(completedEvenings);
  const doneKeys = useMemo(() => new Set(sessions.map((s) => s.exercise_key)), [sessions]);
  const traits = useMemo(() => mirrorTraits(TRAITS, userTraits), [userTraits]);
  const entries = useMemo(() => searchEntries(TRAITS, words, userTraits), [words, userTraits]);
  const thoughtActive = path.thought_stage < 3;
  const stage = Math.min(path.thought_stage, 2);
  const doneIn = (part: DayPart, match: (s: TodaySession) => boolean) =>
    sessions.some((s) => match(s) && slotOf(s.started_at) === part);
  const thoughtDone = (part: DayPart) => doneIn(part, (s) => isThoughtKey(s.exercise_key));
  const breathDone = (part: DayPart) => doneIn(part, (s) => s.exercise_key === SESSION_KEYS.breath);
  const bodyDue = (part: DayPart) => bodyItemsFor(path.body_plan, today, part);
  const bodyDone = (item: BodyItem) => doneKeys.has(SESSION_KEYS.body(item.key));
  const eveningDone = Boolean(evening?.completed_at);
  // The open cycle has all its evenings: the two soul mirrors can be made on the Tükör tab
  const doneInCycle = cycle ? data.cycleEvenings.length + (eveningDone && evening?.cycle_id === cycle.id ? 1 : 0) : 0;
  const cycleReady = Boolean(cycle && isCycleReady(doneInCycle, cycle.length_days));
  const labels = content.body;

  const elementOf = (key: string): ElementType | null => {
    const own = userTraits.find((a) => addedKey(a) === key);
    if (own?.element) return own.element;
    return TRAIT_BY_KEY.get(key)?.element ?? null;
  };
  const nameOf = (key: string) => traitName(key, words, userTraits);

  const tasks = dayTasks({ bodyPlan: path.body_plan, thoughtStage: path.thought_stage, today, sessions, unlocked, eveningDone });

  const pendingSteps = (part: DayPart): Step[] => {
    const steps: Step[] = [];
    // The first choice of body-training items is offered in the morning or the evening
    if (path.body_plan.length === 0 && part !== 'napkozben') steps.push('setup');
    for (const task of tasks) {
      if (task.part !== part || task.done) continue;
      steps.push(task.key === 'selfExam' ? ((evening?.step ?? 0) === 0 ? 'recall' : 'cards') : task.key);
    }
    return steps;
  };

  // The evening reminder opens the evening right away, once on arrival (a reload does not reopen it)
  useEffect(() => {
    if (!openEvening) return;
    window.history.replaceState(null, '', window.location.pathname);
    const id = window.setTimeout(() => {
      const steps = pendingSteps('este');
      if (steps.length > 0) setFlow({ part: 'este', step: steps[0], skipped: [] });
    }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on arrival
  }, []);

  const nextStep = (part: DayPart, skipped: Step[]): Step | 'done' =>
    pendingSteps(part).find((s) => !skipped.includes(s)) ?? 'done';

  // Re-evaluate after every saved change; `skipped` keeps a step the user moved on from
  const advance = (skip?: Step) =>
    setFlow((f) => {
      if (!f) return f;
      const skipped = skip ? [...f.skipped, skip] : f.skipped;
      return { ...f, skipped, step: nextStep(f.part, skipped) };
    });

  const closeFlow = () => {
    setFlow(null);
    router.refresh();
  };

  // ── saving ────────────────────────────────────────────────────────────────
  const dayStartIso = () => new Date(Date.parse(getBudapestDayBounds(today).start) + DAY_STARTS_AT_HOUR * 3_600_000).toISOString();

  const savePlan = async (plan: BodyItem[]) => {
    await updatePath(userId, { body_plan: plan });
    setPath((p) => ({ ...p, body_plan: plan }));
    setSeen((s) => ({ ...s, body: true }));
    // Continue with today's items of this part of the day, if there are any
    setFlow((f) => {
      if (!f) return f;
      const skipped: Step[] = [...f.skipped.filter((s) => s !== 'body'), 'setup'];
      const hasBody = bodyItemsFor(plan, today, f.part).some((i) => !bodyDone(i));
      return { ...f, skipped, step: hasBody ? 'body' : nextStep(f.part, skipped) };
    });
  };

  /** A daily tick (body item, eating, water): a session of today, or none. */
  const toggleTick = async (key: string, done: boolean) => {
    if (done) {
      const startedAt = new Date().toISOString();
      await saveSession(userId, { section: 'test', exerciseKey: key, fokozat: path.fokozat, startedAt });
      setSessions((s) => [...s, { exercise_key: key, started_at: startedAt, outcome: null, reps: null }]);
    } else {
      await deleteSessionsSince(userId, key, dayStartIso());
      setSessions((s) => s.filter((x) => x.exercise_key !== key));
    }
  };

  const saveThought = async (saved: ThoughtSaved, durationSec: number, targetSec: number) => {
    await saveSession(userId, {
      section: 'szellem',
      exerciseKey: saved.session.exercise_key,
      fokozat: path.fokozat,
      startedAt: saved.session.started_at,
      durationSec,
      targetSec,
      outcome: saved.session.outcome,
    });
    await updatePath(userId, { ...saved.state, thought_focus: saved.focus });
    setPath((p) => ({ ...p, ...saved.state, thought_focus: saved.focus }));
    setSessions((s) => [...s, { ...saved.session, reps: null }]);
    setSeen((s) => ({ ...s, thought: true }));
  };

  const decideThought = async (next: ThoughtState) => {
    await updatePath(userId, next);
    setPath((p) => ({ ...p, ...next }));
    // A new stage starts with its own Útravaló
    if (next.thought_stage !== path.thought_stage) setSeen((s) => ({ ...s, thought: false }));
  };

  const saveWish = async (wish: string) => {
    const now = new Date().toISOString();
    await updatePath(userId, { wish, wish_set_at: now });
    setPath((p) => ({ ...p, wish, wish_set_at: now }));
  };

  const saveBreath = async (next: BreathState, reps: number, durationSec: number, startedAt: string) => {
    await saveSession(userId, { section: 'test', exerciseKey: SESSION_KEYS.breath, fokozat: path.fokozat, startedAt, durationSec, reps });
    await updatePath(userId, next);
    setPath((p) => ({ ...p, ...next }));
    setSessions((s) => [...s, { exercise_key: SESSION_KEYS.breath, started_at: startedAt, outcome: null, reps }]);
    setSeen((s) => ({ ...s, breath: true }));
  };

  // ── the evening ───────────────────────────────────────────────────────────
  /**
   * The first evening of a cycle opens it. A full cycle not closed on the
   * Tükör tab is closed here with its averages, so the evenings go on.
   */
  const currentCycleId = async (): Promise<string> => {
    if (cycle && !isCycleReady(data.cycleEvenings.length, cycle.length_days)) return cycle.id;
    if (cycle) await closeCycle(userId, cycle.id, summarize(data.cycleEvenings, traits.map((tr) => tr.key)), {});
    const number = (cycle?.number ?? data.lastCycleNumber) + 1;
    const id = await openCycle(userId, number, path.fokozat, today);
    setCycle({ id, number, fokozat: path.fokozat, length_days: 14, started_on: today, closed_at: null });
    return id;
  };

  const storeEvening = async (ratings: Ratings, step: number, completed = false) => {
    // A started evening stays in its cycle
    const cycleId = evening?.cycle_id ?? (await currentCycleId());
    await saveEvening(userId, { obsDate: today, cycleId, ratings, step, completed });
    setEvening((e) => ({
      obs_date: today,
      cycle_id: cycleId,
      ratings,
      step,
      completed_at: completed ? new Date().toISOString() : (e?.completed_at ?? null),
    }));
  };

  const recallDone = async () => {
    setBusy(true);
    setFlowError(null);
    try {
      await storeEvening(evening?.ratings ?? {}, 1);
      setFlow((f) => (f ? { ...f, step: 'cards' } : f));
    } catch (err) {
      console.error('[magia] evening start failed', err);
      setFlowError(t('flow.saveError'));
    } finally {
      setBusy(false);
    }
  };

  const finishEvening = async () => {
    setBusy(true);
    setFlowError(null);
    try {
      const ratings = evening?.ratings ?? {};
      await storeEvening(ratings, evening?.step ?? 1, true);
      await saveSession(userId, { section: 'lelek', exerciseKey: SESSION_KEYS.selfExam, fokozat: path.fokozat, startedAt: new Date().toISOString() });
      setSeen((s) => ({ ...s, selfExam: true }));
      setCompletedEvenings((n) => n + 1);
      setFlow((f) => (f ? { ...f, step: 'sleep' } : f));
    } catch (err) {
      console.error('[magia] evening finish failed', err);
      setFlowError(t('flow.saveError'));
    } finally {
      setBusy(false);
    }
  };

  /** A trait added at the end of the evening, rated right away */
  const addTonight = async (pick: TraitPick): Promise<string> => {
    const added = await addUserTrait(userId, {
      mirror: pick.mirror,
      traitKey: pick.kind === 'dict' ? pick.key : undefined,
      name: pick.kind === 'new' ? pick.name : undefined,
      element: pick.element ?? null,
    });
    setUserTraits((list) => (list.some((a) => a.id === added.id) ? list : [...list, added]));
    const ratings = { ...(evening?.ratings ?? {}), [addedKey(added)]: pick.level ?? 1 };
    await storeEvening(ratings, evening?.step ?? 1);
    return t('evening.added', { name: pick.name });
  };

  /** "+" during the day: note a trait; a new one goes into the mirror */
  const noteNow = async (pick: TraitPick): Promise<string> => {
    let key = pick.key ?? '';
    if (pick.kind !== 'mine') {
      const added = await addUserTrait(userId, {
        mirror: pick.mirror,
        traitKey: pick.kind === 'dict' ? pick.key : undefined,
        name: pick.kind === 'new' ? pick.name : undefined,
        element: pick.element ?? null,
      });
      setUserTraits((list) => (list.some((a) => a.id === added.id) ? list : [...list, added]));
      key = addedKey(added);
    }
    await addDayNote(userId, today, key, pick.note ?? null);
    setNoteKeys((k) => (k.includes(key) ? k : [...k, key]));
    return pick.kind === 'mine' ? t('picker.savedToday', { name: pick.name }) : t('picker.savedNew', { name: pick.name });
  };

  // ── the day ───────────────────────────────────────────────────────────────
  const rows = (part: DayPart): Row[] => {
    const out: Row[] = [];
    if (path.body_plan.length === 0) {
      if (part !== 'napkozben') out.push({ label: t('items.body'), meta: t('items.bodySetup'), state: 'todo', info: content.utravalo.test });
    } else {
      const due = bodyDue(part);
      if (due.length) {
        const n = due.filter(bodyDone).length;
        out.push({ label: t('items.body'), meta: `${n}/${due.length}`, state: n === due.length ? 'done' : 'todo', info: content.utravalo.test });
      }
    }
    if (part === 'napkozben') {
      const later = t('items.fromDay', { day: UNLOCK_MEAL_WATER_AFTER + 1 });
      out.push(
        unlocked.mealWater
          ? { label: t('items.meal'), meta: '', state: doneKeys.has(SESSION_KEYS.meal) ? 'done' : 'todo', info: content.utravalo.etkezes }
          : { label: t('items.meal'), meta: later, state: 'locked' }
      );
      out.push(
        unlocked.mealWater
          ? { label: t('items.water'), meta: '', state: doneKeys.has(SESSION_KEYS.water) ? 'done' : 'todo', info: content.utravalo.viz }
          : { label: t('items.water'), meta: later, state: 'locked' }
      );
      return out;
    }
    if (thoughtActive) {
      out.push({
        label: content.thought.stages[stage].name,
        meta: t('items.minutes', { minutes: path.thought_minutes }),
        state: thoughtDone(part) ? 'done' : 'todo',
        info: content.utravalo[THOUGHT_PAGES[stage]],
      });
    }
    out.push(
      unlocked.breath
        ? {
            label: t('items.breath'),
            meta: t('items.breaths', { count: breathTargetFor(path, today) }),
            state: breathDone(part) ? 'done' : 'todo',
            info: content.utravalo.legzes,
          }
        : { label: t('items.breath'), meta: t('items.fromDay', { day: UNLOCK_BREATH_AFTER + 1 }), state: 'locked' }
    );
    if (part === 'este') {
      out.push({
        label: t('items.selfExam'),
        meta: eveningDone ? '' : (evening?.step ?? 0) > 0 ? t('items.selfExamResume') : t('items.selfExamAll'),
        state: eveningDone ? 'done' : 'todo',
        info: content.utravalo.onvizsgalat,
      });
    }
    return out;
  };

  const flowTitle = flow ? t(`blocks.${flow.part}`) : '';
  const dim = flow ? ['thought', 'breath', 'recall', 'sleep'].includes(flow.step) : false;

  return (
    // Room at the bottom for the "+" button
    <div className="space-y-5 pb-20">
      {/* The tab's content comes in like the settings tabs (the "+" stays outside: it is fixed) */}
      <div className="animate-fade-up space-y-5 motion-reduce:animate-none">
      {cycleReady && (
        <Link
          href={`/${locale}/modules/magia/tukor`}
          className="block rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm text-cream transition hover:bg-accent/15"
        >
          <b className="block font-display text-lg text-gradient-gold">{t('mirror.readyTitle')}</b>
          {t('mirror.banner')} <span className="font-semibold text-accent">{t('mirror.bannerLink')} →</span>
        </Link>
      )}
      {PARTS.map((part) => {
        const list = rows(part);
        const pending = pendingSteps(part);
        const anyDone = list.some((r) => r.state === 'done');
        return (
          <section key={part} className="rounded-2xl border border-border/50 bg-card/30 p-4 sm:p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold text-cream">{t(`blocks.${part}`)}</h2>
              {list.length > 0 && pending.length === 0 && list.some((r) => r.state !== 'locked') && (
                <span className="text-xs text-accent">{t('blocks.done')}</span>
              )}
            </div>
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('blocks.nothing')}</p>
            ) : (
              <ul className="space-y-2">
                {list.map((row) => (
                  <li
                    key={row.label}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm',
                      row.state === 'done' && 'border-accent/30 bg-accent/5',
                      row.state === 'todo' && 'border-border/50',
                      row.state === 'locked' && 'border-dashed border-border/40 text-muted-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]',
                        row.state === 'done' ? 'border-accent bg-accent text-accent-foreground' : 'border-muted-foreground/40'
                      )}
                      aria-hidden
                    >
                      {row.state === 'done' ? '✓' : row.state === 'locked' ? <AppIcon name="lock" className="h-3 w-3 text-muted-foreground" /> : ''}
                    </span>
                    <span className={cn('flex-1', row.state !== 'locked' && 'text-cream')}>{row.label}</span>
                    {row.meta && <span className="text-xs tabular-nums text-muted-foreground">{row.meta}</span>}
                    {row.info && (
                      <button
                        type="button"
                        onClick={() => setReading(row.info!)}
                        className="rounded-full p-1 text-muted-foreground transition hover:text-accent"
                        aria-label={t('items.info', { title: row.info.title })}
                      >
                        <AppIcon name="book" className="h-4 w-4 text-current" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {pending.length > 0 && (
              <button
                type="button"
                onClick={() => setFlow({ part, step: pending[0], skipped: [] })}
                className="mt-4 w-full rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/30 hover:shadow-glow-gold"
              >
                {anyDone ? t('blocks.continue') : t('blocks.start')}
              </button>
            )}
          </section>
        );
      })}

      </div>

      {/* "+": a note during the day */}
      <button
        type="button"
        onClick={() => setNoting(true)}
        aria-label={t('quickNote.title')}
        className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-accent-foreground shadow-glow-gold transition hover:scale-105 md:bottom-8"
        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
      >
        +
      </button>

      {noting && (
        <FlowShell title={t('quickNote.title')} onClose={() => setNoting(false)}>
          <p className="text-sm text-muted-foreground">{t('quickNote.hint')}</p>
          <TraitPicker
            mode="day"
            entries={entries}
            elementOf={elementOf}
            hints={content.elements.hints}
            elementNames={content.elements.names}
            onSave={noteNow}
          />
        </FlowShell>
      )}

      {reading && (
        <FlowShell title={t('utravalo.label')} onClose={() => setReading(null)}>
          <UtravaloView page={reading} source={content.source} onDone={() => setReading(null)} doneLabel={t('utravalo.close')} />
        </FlowShell>
      )}

      {flow && (
        <FlowShell title={flowTitle} onClose={closeFlow} dim={dim}>
          {flowError && <p className="text-sm text-red-400">{flowError}</p>}
          {flow.step === 'setup' && <BodySetup labels={labels} initial={path.body_plan} onSave={savePlan} />}
          {flow.step === 'body' && (
            <BodyChecklist
              items={bodyDue(flow.part)}
              labels={labels}
              isDone={bodyDone}
              onToggle={(item, done) => toggleTick(SESSION_KEYS.body(item.key), done)}
              onEdit={() => setFlow((f) => (f ? { ...f, step: 'setup' } : f))}
              onNext={() => advance('body')}
              showWaterHint={!unlocked.mealWater}
            />
          )}
          {flow.step === 'thought' && (
            <ThoughtPractice
              key={`thought-${path.thought_stage}`}
              state={path}
              focus={path.thought_focus}
              wish={path.wish}
              today={today}
              stages={content.thought.stages}
              utravalo={THOUGHT_PAGES.map((k) => content.utravalo[k])}
              source={content.source}
              seen={seen.thought}
              onSave={saveThought}
              onDecide={decideThought}
              onNext={() => advance('thought')}
            />
          )}
          {flow.step === 'breath' && (
            <BreathPractice
              state={path}
              wish={path.wish}
              wishes={content.wishes}
              today={today}
              utravalo={content.utravalo.legzes}
              source={content.source}
              seen={seen.breath}
              onWish={saveWish}
              onSave={saveBreath}
              onNext={() => advance('breath')}
            />
          )}
          {(flow.step === 'meal' || flow.step === 'water') && (
            <HabitStep
              key={flow.step}
              title={t(flow.step === 'meal' ? 'items.meal' : 'items.water')}
              label={t(flow.step === 'meal' ? 'habits.meal' : 'habits.water')}
              utravalo={flow.step === 'meal' ? content.utravalo.etkezes : content.utravalo.viz}
              source={content.source}
              seen={flow.step === 'meal' ? seen.meal : seen.water}
              done={doneKeys.has(flow.step === 'meal' ? SESSION_KEYS.meal : SESSION_KEYS.water)}
              onToggle={async (done) => {
                await toggleTick(flow.step === 'meal' ? SESSION_KEYS.meal : SESSION_KEYS.water, done);
                setSeen((s) => ({ ...s, [flow.step]: true }));
              }}
              onNext={() => advance(flow.step as Step)}
            />
          )}
          {flow.step === 'recall' &&
            (!seen.selfExam && !flow.introRead ? (
              <UtravaloView page={content.utravalo.onvizsgalat} source={content.source} onDone={() => setFlow((f) => (f ? { ...f, introRead: true } : f))} />
            ) : (
              <RecallStep onDone={recallDone} busy={busy} />
            ))}
          {flow.step === 'cards' && (
            <EveningCards
              traits={traits}
              cycleEvenings={data.cycleEvenings}
              names={nameOf}
              questions={(key) => words[key]?.q}
              elementNames={content.elements.names}
              noteKeys={noteKeys}
              initialRatings={evening?.ratings ?? {}}
              initialCard={Math.max(0, (evening?.step ?? 1) - 1)}
              onSave={(ratings, nextCard) => storeEvening(ratings, 1 + nextCard)}
              onDone={() => setFlow((f) => (f ? { ...f, step: 'add' } : f))}
            />
          )}
          {flow.step === 'add' && (
            <div className="flex flex-1 flex-col gap-4">
              <h2 className="font-display text-xl font-semibold text-cream">{t('evening.addTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('evening.addHint')}</p>
              <TraitPicker
                mode="obs"
                entries={entries}
                elementOf={elementOf}
                hints={content.elements.hints}
                elementNames={content.elements.names}
                onSave={addTonight}
              />
              <button
                type="button"
                onClick={finishEvening}
                disabled={busy}
                className="mt-auto rounded-xl border border-border/50 px-4 py-3 text-sm text-cream transition hover:border-accent/40 disabled:opacity-50"
              >
                {t('evening.finish')}
              </button>
            </div>
          )}
          {flow.step === 'sleep' && (
            <SleepStep wish={path.wish} quote={content.sleep} counts={markedCounts(evening?.ratings ?? {}, traits)} onDone={closeFlow} />
          )}
          {flow.step === 'done' && (
            <div className="flex flex-1 flex-col gap-4">
              <p className="font-display text-2xl font-semibold text-gradient-gold">{t('flow.doneTitle')}</p>
              <p className="text-cream">{flow.part === 'reggel' ? t('flow.morningDone') : t('flow.dayDone')}</p>
              <button
                type="button"
                onClick={closeFlow}
                className="mt-auto rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/30"
              >
                {t('flow.close')}
              </button>
            </div>
          )}
        </FlowShell>
      )}
    </div>
  );
}

interface Row {
  label: string;
  meta: string;
  state: 'done' | 'todo' | 'locked';
  info?: ReadingPage;
}

