// Which traits are on the evening cards, and how they are searched. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addedKey, markedCounts, mirrorTraits, searchEntries, traitName } from '../../lib/magia/evening.ts';
import { searchTraits } from '../../lib/magia/search.ts';

const dictionary = [
  { key: 'harag', mirror: 'fekete', element: 'tuz', core: true },
  { key: 'nyugalom', mirror: 'feher', element: 'viz', core: true },
  { key: 'turelmetlenseg', mirror: 'fekete', element: 'tuz', core: false },
  { key: 'hala', mirror: 'feher', element: 'viz', core: false },
] as const;
const words = {
  harag: { name: 'harag', forms: ['dühös'] },
  nyugalom: { name: 'nyugalom', forms: ['nyugodt'] },
  turelmetlenseg: { name: 'türelmetlenség', forms: ['türelmetlen'] },
  hala: { name: 'hála', forms: ['hálás'] },
};
const added = [
  { id: 'a1', mirror: 'fekete', trait_key: 'turelmetlenseg', name: null, element: null },
  { id: 'a2', mirror: 'fekete', trait_key: null, name: 'kapkodás a reggelekben', element: null },
  { id: 'a3', mirror: 'fekete', trait_key: 'harag', name: null, element: null }, // already core
] as const;

test('the cards hold the core list, then the added traits once each', () => {
  const traits = mirrorTraits([...dictionary], [...added]);
  assert.deepEqual(traits.map((t) => t.key), ['harag', 'nyugalom', 'turelmetlenseg', 'own:a2']);
  // A dictionary word keeps its element; an own word without one is unclassified
  assert.equal(traits[2].element, 'tuz');
  assert.equal(traits[3].element, null);
  assert.equal(addedKey(added[1]), 'own:a2');
});

test('names are capitalised, own words included', () => {
  assert.equal(traitName('turelmetlenseg', words, [...added]), 'Türelmetlenség');
  assert.equal(traitName('own:a2', words, [...added]), 'Kapkodás a reggelekben');
});

test('search: the user’s mirror first, the rest of the dictionary after', () => {
  const entries = searchEntries([...dictionary], words, [...added]);
  const r = searchTraits('türelm', entries, 'fekete');
  assert.deepEqual(r.mine.map((e) => e.key), ['turelmetlenseg']); // added → mine
  assert.deepEqual(searchTraits('hál', entries, 'feher').dict.map((e) => e.key), ['hala']);
  assert.deepEqual(searchTraits('kapkod', entries, 'fekete').mine.map((e) => e.key), ['own:a2']);
});

test('tonight’s marks by mirror; "not sure" is not a mark', () => {
  const traits = mirrorTraits([...dictionary], [...added]);
  assert.deepEqual(markedCounts({ harag: 2, turelmetlenseg: '?', nyugalom: 1 }, traits), { fekete: 1, feher: 1 });
});
