// Rules of the Fehér Mágia path. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptBack,
  acceptUp,
  advanceStage,
  afterBreath,
  applyThoughtOutcome,
  bodyItemsFor,
  breathTargetFor,
  declineBack,
  defaultBodyItem,
  fokozatIConditions,
  practiceDate,
  slotOf,
  unlockedExercises,
  weekdayOf,
} from '../../lib/magia/path.ts';

test('a practice day starts at 4:00 Budapest time', () => {
  // 2026-11-02 is winter time (UTC+1)
  assert.equal(practiceDate('2026-11-02T02:30:00Z'), '2026-11-01'); // 03:30 local
  assert.equal(practiceDate('2026-11-02T03:30:00Z'), '2026-11-02'); // 04:30 local
  assert.equal(practiceDate('2026-11-02T22:30:00Z'), '2026-11-02'); // 23:30 local
  // summer time (UTC+2)
  assert.equal(practiceDate('2026-07-10T01:59:00Z'), '2026-07-09'); // 03:59 local
});

test('morning and evening sessions', () => {
  assert.equal(slotOf('2026-11-02T05:00:00Z'), 'reggel'); // 06:00
  assert.equal(slotOf('2026-11-02T13:59:00Z'), 'reggel'); // 14:59
  assert.equal(slotOf('2026-11-02T14:00:00Z'), 'este'); // 15:00
  assert.equal(slotOf('2026-11-02T01:00:00Z'), 'este'); // 02:00, still the evening before
});

const start = { thought_stage: 0, thought_minutes: 1, thought_wins: 0, thought_fails: 0, thought_raised_on: null } as const;

test('success under 10 minutes offers one more minute, once a day', () => {
  const first = applyThoughtOutcome(start, 'igen', '2026-11-02');
  assert.equal(first.offer, 'up');
  const raised = acceptUp(first.state, '2026-11-02');
  assert.equal(raised.thought_minutes, 2);
  // Evening success on the same day: no second raise
  assert.equal(applyThoughtOutcome(raised, 'igen', '2026-11-02').offer, null);
  assert.equal(applyThoughtOutcome(raised, 'igen', '2026-11-03').offer, 'up');
});

test('three failures in a row offer stepping back; partial success resets', () => {
  let s = { ...start, thought_minutes: 4 };
  s = applyThoughtOutcome(s, 'nem', 'd').state;
  s = applyThoughtOutcome(s, 'nem', 'd').state;
  const third = applyThoughtOutcome(s, 'nem', 'd');
  assert.equal(third.offer, 'back');
  assert.equal(acceptBack(third.state).thought_minutes, 3);
  assert.equal(declineBack(third.state).thought_fails, 0);
  const partial = applyThoughtOutcome({ ...s, thought_fails: 2 }, 'reszben', 'd');
  assert.equal(partial.state.thought_fails, 0);
  assert.equal(partial.offer, null);
});

test('no stepping back below 1 minute', () => {
  const s = { ...start, thought_fails: 2 };
  assert.equal(applyThoughtOutcome(s, 'nem', 'd').offer, null);
});

test('three successful 10-minute sessions open the next stage at 1 minute', () => {
  let s = { ...start, thought_minutes: 10 };
  s = applyThoughtOutcome(s, 'igen', 'd').state;
  s = applyThoughtOutcome(s, 'igen', 'd').state;
  const third = applyThoughtOutcome(s, 'igen', 'd');
  assert.equal(third.offer, 'nextStage');
  const next = advanceStage(third.state);
  assert.deepEqual([next.thought_stage, next.thought_minutes, next.thought_wins], [1, 1, 0]);
});

test('a failure breaks the 10-minute streak', () => {
  let s = { ...start, thought_minutes: 10 };
  s = applyThoughtOutcome(s, 'igen', 'd').state;
  s = applyThoughtOutcome(s, 'igen', 'd').state;
  s = applyThoughtOutcome(s, 'nem', 'd').state;
  assert.equal(applyThoughtOutcome(s, 'igen', 'd').offer, null);
});

test('mastering emptiness finishes the thought practice', () => {
  const s = { ...start, thought_stage: 2, thought_minutes: 10, thought_wins: 2 } as const;
  const last = applyThoughtOutcome(s, 'igen', 'd');
  assert.equal(last.offer, 'allDone');
  assert.equal(advanceStage(last.state).thought_stage, 3);
});

test('breathing target grows by one per practiced day', () => {
  let s = { breath_target: 7, breath_raised_on: null as string | null };
  assert.equal(breathTargetFor(s, 'd1'), 7);
  s = afterBreath(s, 7, 90, '2026-11-01');
  assert.equal(breathTargetFor(s, '2026-11-01'), 7); // same day: no raise
  assert.equal(breathTargetFor(s, '2026-11-02'), 8);
  // A missed target keeps the new target without raising it further
  s = afterBreath(s, 5, 80, '2026-11-02');
  assert.equal(breathTargetFor(s, '2026-11-03'), 8);
  // Skipped days add only one
  s = afterBreath(s, 8, 90, '2026-11-03');
  assert.equal(breathTargetFor(s, '2026-11-09'), 9);
});

test('breathing stops growing at 10 minutes', () => {
  const s = afterBreath({ breath_target: 60, breath_raised_on: null }, 60, 610, '2026-11-01');
  assert.equal(breathTargetFor(s, '2026-11-02'), 60);
});

test('one new step a week', () => {
  assert.deepEqual(unlockedExercises(6), { breath: false, mealWater: false });
  assert.deepEqual(unlockedExercises(7), { breath: true, mealWater: false });
  assert.deepEqual(unlockedExercises(14), { breath: true, mealWater: true });
});

test('body items by weekday and part of the day', () => {
  assert.equal(weekdayOf('2026-10-19'), 0); // Monday
  assert.equal(weekdayOf('2026-10-25'), 6); // Sunday
  const plan = [
    defaultBodyItem('kefeles'),
    { key: 'futas', when: 'este' as const, days: [0, 2, 4] },
    { key: 'uszas', when: 'napkozben' as const, days: [5] },
  ];
  assert.equal(defaultBodyItem('kefeles').when, 'reggel');
  assert.equal(defaultBodyItem('joga').when, 'napkozben');
  const wednesday = '2026-10-21';
  assert.deepEqual(bodyItemsFor(plan, wednesday).map((i) => i.key), ['kefeles', 'futas']);
  assert.deepEqual(bodyItemsFor(plan, wednesday, 'este').map((i) => i.key), ['futas']);
});

test('the II. fokozat opens after the Gate, the three thought stages and two cycles', () => {
  const almost = fokozatIConditions({ gateRead: true, thoughtStage: 3, closedCycles: 1 });
  assert.equal(almost.allDone, false);
  assert.equal(almost.conditions.find((c) => c.key === 'cycles')?.done, false);
  const done = fokozatIConditions({ gateRead: true, thoughtStage: 3, closedCycles: 2 });
  assert.equal(done.allDone, true);
  assert.equal(done.percent, 100);
  assert.deepEqual(done.conditions.map((c) => c.key), ['gate', 'thought', 'cycles']);
  assert.equal(fokozatIConditions({ gateRead: false, thoughtStage: 0, closedCycles: 0 }).percent, 0);
});
