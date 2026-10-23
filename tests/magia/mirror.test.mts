// The 14-day mirror, the evening cards and the trait search. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEveningCards, effectiveLevel, elementBalance, gridGroups, isCycleReady, levelChanges, levelOf, needsHonestyWeek, summarize } from '../../lib/magia/mirror.ts';
import { normalize, searchTraits } from '../../lib/magia/search.ts';
import { CORE_TRAITS, TRAITS, TRAIT_BY_KEY } from '../../lib/magia/traits.ts';

test('levels follow the approved thresholds', () => {
  assert.deepEqual([0, 0.49, 0.5, 1.49, 1.5, 2.49, 2.5, 3].map(levelOf), [0, 0, 1, 1, 2, 2, 3, 3]);
});

test('a missing rating is "not characteristic", "not sure" does not count', () => {
  const evenings = [{ harag: 3 }, { harag: '?' }, {}, { harag: 2 }] as const;
  const s = summarize(evenings as never, ['harag', 'gyulolet']);
  assert.equal(s.harag.avg, 5 / 3);
  assert.equal(s.harag.level, 2);
  assert.equal(s.harag.days, 2);
  assert.equal(s.harag.unsure, 1);
  assert.equal(s.gyulolet.level, 0);
});

test('the user’s own sorting wins over the average', () => {
  const s = summarize([{ harag: 3 }], ['harag']);
  assert.equal(effectiveLevel(s, {}, 'harag'), 3);
  assert.equal(effectiveLevel(s, { harag: 1 }, 'harag'), 1);
});

const traits = [
  { key: 'harag', mirror: 'fekete', element: 'tuz' },
  { key: 'torkossag', mirror: 'fekete', element: 'tuz' },
  { key: 'fecseges', mirror: 'fekete', element: 'levego' },
  { key: 'lustasag', mirror: 'fekete', element: 'fold' },
  { key: 'own:1', mirror: 'fekete', element: null },
  { key: 'nyugalom', mirror: 'feher', element: 'viz' },
] as const;

test('dominant element of a mirror', () => {
  const s = summarize([{ harag: 3, torkossag: 2, lustasag: 2 }], traits.map((t) => t.key));
  const { totals, dominant } = elementBalance([...traits], 'fekete', s);
  assert.deepEqual(totals, { tuz: 5, levego: 0, viz: 0, fold: 2 });
  assert.equal(dominant, 'tuz');
});

test('honesty check counts black traits at least "kicsit"', () => {
  const s = summarize([{ harag: 1, torkossag: 1 }], traits.map((t) => t.key));
  assert.equal(needsHonestyWeek([...traits], s), true);
});

test('the grid: present traits by element, strongest first; the rest apart', () => {
  const s = summarize([{ harag: 1, torkossag: 3, lustasag: 2 }, { harag: 1, torkossag: 2 }], traits.map((t) => t.key));
  const { groups, quiet } = gridGroups([...traits], 'fekete', s);
  assert.deepEqual(groups.map((g) => [g.element, g.keys.join(',')]), [['tuz', 'torkossag,harag'], ['fold', 'lustasag']]);
  assert.deepEqual(quiet, ['fecseges', 'own:1']);
  // The user's sorting moves a trait
  const sorted = gridGroups([...traits], 'fekete', s, { lustasag: 0 });
  assert.ok(sorted.quiet.includes('lustasag'));
  assert.equal(isCycleReady(13, 14), false);
  assert.equal(isCycleReady(14, 14), true);
});

test('changes since the previous cycle', () => {
  const prev = summarize([{ harag: 3 }], ['harag']);
  const curr = summarize([{ harag: 2 }], ['harag']);
  assert.deepEqual(levelChanges(prev, curr), { harag: -1 });
});

test('evening cards: black first, marked traits first by strength, then by element', () => {
  const soFar = summarize([{ torkossag: 3, lustasag: 1 }], traits.map((t) => t.key));
  const cards = buildEveningCards([...traits], soFar);
  assert.deepEqual(
    cards.map((c) => [c.mirror, c.kind, c.element, c.keys.join(',')]),
    [
      ['fekete', 'marked', null, 'torkossag,lustasag'],
      ['fekete', 'element', 'tuz', 'harag'],
      ['fekete', 'element', 'levego', 'fecseges'],
      ['fekete', 'element', null, 'own:1'],
      ['feher', 'element', 'viz', 'nyugalom'],
    ]
  );
});

test('the first evening of the real list: 11 cards of at most 12 rows', () => {
  const list = CORE_TRAITS.map((t) => ({ key: t.key, mirror: t.mirror, element: t.element }));
  const cards = buildEveningCards(list, {});
  assert.equal(cards.length, 11);
  assert.ok(cards.every((c) => c.keys.length <= 12));
  assert.equal(cards.reduce((n, c) => n + c.keys.length, 0), 98);
});

test('the dictionary: 98 core traits, counterparts in the other mirror', () => {
  assert.equal(CORE_TRAITS.length, 98);
  assert.equal(CORE_TRAITS.filter((t) => t.mirror === 'feher').length, 52);
  for (const t of TRAITS) {
    const pair = TRAIT_BY_KEY.get(t.pair);
    assert.ok(pair, `${t.key}: counterpart ${t.pair} missing`);
    assert.notEqual(pair.mirror, t.mirror, `${t.key}: counterpart in the same mirror`);
  }
});

test('search is accent-insensitive and finds word forms', () => {
  const entries = [
    { key: 'ingerlekenyseg', mirror: 'fekete', name: 'ingerlékenység', forms: ['ingerlékeny', 'ideges'], source: 'dict' },
    { key: 'izgagasag', mirror: 'fekete', name: 'izgágaság', forms: ['izgága'], source: 'core' },
    { key: 'nyugalom', mirror: 'feher', name: 'nyugalom', forms: ['nyugodt'], source: 'core' },
  ] as const;
  assert.equal(normalize('  Izgága '), 'izgaga');
  const r = searchTraits('IDEGES', [...entries], 'fekete');
  assert.deepEqual(r.dict.map((e) => e.key), ['ingerlekenyseg']);
  assert.equal(r.exact, true);
  assert.deepEqual(searchTraits('izga', [...entries], 'fekete').core.map((e) => e.key), ['izgagasag']);
  assert.equal(searchTraits('nyug', [...entries], 'fekete').core.length, 0); // other mirror
  assert.equal(searchTraits('i', [...entries], 'fekete').exact, false); // too short
});

test('search matches the start of a word only', () => {
  const entries = [
    { key: 'ridegseg', mirror: 'fekete', name: 'ridegség', forms: ['rideg'], source: 'dict' },
    { key: 'ingerlekenyseg', mirror: 'fekete', name: 'ingerlékenység', forms: ['ideges'], source: 'dict' },
    { key: 'kitartas_hianya', mirror: 'fekete', name: 'kitartás hiánya', forms: [], source: 'core' },
  ] as const;
  assert.deepEqual(searchTraits('ideg', [...entries], 'fekete').dict.map((e) => e.key), ['ingerlekenyseg']);
  assert.deepEqual(searchTraits('hiány', [...entries], 'fekete').core.map((e) => e.key), ['kitartas_hianya']);
});
