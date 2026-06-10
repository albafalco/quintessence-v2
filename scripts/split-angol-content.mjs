import { readFileSync, writeFileSync } from 'fs';

const raw = JSON.parse(readFileSync('./messages/content/angol-lesson1.hu.json', 'utf8'));

const practice = raw.practice.map(({ id, tipus, mondatok }) => ({
  id,
  tipus,
  mondatok: mondatok.map((m) => ({ prompt: m.hu, answer: m.en })),
}));
writeFileSync('./messages/content/angol-lesson1.json', JSON.stringify({ practice }, null, 2));

const labels = {
  sections: raw.sections,
  sectionLabels: raw.sectionLabels,
  lessons: raw.lessons,
};
for (const loc of ['hu', 'en', 'de', 'es', 'it']) {
  writeFileSync(
    `./messages/content/angol-lesson1-labels.${loc}.json`,
    JSON.stringify(labels, null, 2)
  );
}

const vocab = JSON.parse(readFileSync('./messages/content/angol-vocabulary.hu.json', 'utf8'));
writeFileSync(
  './messages/content/angol-vocabulary.json',
  JSON.stringify(vocab.map((m) => ({ prompt: m.hu, answer: m.en })), null, 2)
);

console.log('split complete');