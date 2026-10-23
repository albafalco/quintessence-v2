import type { FokozatData } from '@/lib/i18n-content';
import { BADGES } from '@/lib/badges';
import { ROMAN_NUMERALS } from '@/lib/magia-utils';
import { TRAIT_BY_KEY } from '@/lib/magia/traits';

type Row = Record<string, unknown>;
type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Collected data (lib/data-export collectUserData) */
export interface ExportData {
  exportedAt: string;
  account: Row;
  pushDevices: number;
  [table: string]: unknown;
}

interface ReportOptions {
  locale: string;
  /** dataExport namespace */
  t: Translate;
  /** magia namespace (sections, journal fields, mirror, elements) */
  tMagia: Translate;
  /** badges namespace */
  tBadges: Translate;
  fokozatok: FokozatData[];
  /** Texts of the new Fehér Mágia path; its section is left out without them */
  path?: PathTexts;
}

export interface PathTexts {
  /** feherMagia namespace */
  tPath: Translate;
  /** Dictionary trait key → name */
  traitNames: Record<string, string>;
  /** Body-training item key → label */
  bodyLabels: Record<string, string>;
  thoughtStages: string[];
}

const esc = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Multi-line user text: escaped, line breaks kept */
const text = (value: unknown) => esc(value).replace(/\n/g, '<br>');

const rows = (data: ExportData, table: string) => (Array.isArray(data[table]) ? (data[table] as Row[]) : []);

const SECTION_KEYS: Record<string, string> = { szellem: 'shortSzellem', lelek: 'shortLelek', test: 'shortTest' };
const ELEMENT_KEYS: Record<string, string> = {
  tuz: 'soulMirrorElementFire',
  levego: 'soulMirrorElementAir',
  viz: 'soulMirrorElementWater',
  fold: 'soulMirrorElementEarth',
};
const JOURNAL_FIELDS: [string, string][] = [
  ['successes', 'journalFieldSuccesses'],
  ['failures', 'journalFieldFailures'],
  ['disturbances', 'journalFieldDisturbances'],
  ['self_criticism', 'journalFieldSelfCriticism'],
  ['next_plan', 'journalFieldNextPlan'],
  ['content', 'journalFieldContent'],
];

/**
 * The readable copy of the user's data: one self-contained HTML file that
 * opens in any browser and prints to PDF. The JSON file stays the complete,
 * machine-readable copy.
 */
export function buildUserReportHtml(data: ExportData, { locale, t, tMagia, tBadges, fokozatok, path }: ReportOptions) {
  const dateFmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  const dateTimeFmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const date = (iso: unknown) => (iso ? dateFmt.format(new Date(String(iso))) : '—');
  const dateTime = (iso: unknown) => (iso ? dateTimeFmt.format(new Date(String(iso))) : '—');
  const duration = (sec: unknown) => {
    const s = Number(sec) || 0;
    return s >= 60 ? tMagia('durationMinSec', { m: Math.floor(s / 60), s: s % 60 }) : tMagia('durationSec', { s });
  };
  const exerciseTitle = (fokozat: unknown, section: unknown, key: unknown) => {
    const f = fokozatok.find((x) => x.id === Number(fokozat));
    const sec = f?.[section as 'szellem' | 'lelek' | 'test'];
    return sec?.gyakorlatok.find((g) => g.key === key)?.cim ?? String(key ?? '');
  };
  const sectionName = (section: unknown) => (SECTION_KEYS[String(section)] ? tMagia(SECTION_KEYS[String(section)]) : '');
  const empty = `<p class="muted">${esc(t('none'))}</p>`;
  const table = (head: string[], body: string[][]) =>
    body.length === 0
      ? empty
      : `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body
          .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`;

  const account = data.account;
  const fullName = [account.last_name, account.first_name].filter(Boolean).join(' ') || String(account.name ?? '');

  // Grade progress, grouped by grade
  const progress = rows(data, 'magia_progress').sort(
    (a, b) => Number(a.fokozat) - Number(b.fokozat) || String(a.section).localeCompare(String(b.section))
  );
  const statusLabel = (s: unknown) =>
    s === 'mastered' ? t('statusMastered') : s === 'in_progress' ? t('statusInProgress') : t('statusNotStarted');
  const progressHtml = table(
    [t('colGrade'), t('colExercise'), t('colStatus'), t('colSessions'), t('colMasteredAt')],
    progress.map((p) => [
      esc(fokozatok.find((f) => f.id === Number(p.fokozat))?.rovidcim ?? p.fokozat),
      `${esc(exerciseTitle(p.fokozat, p.section, p.exercise_key))}<br><span class="muted">${esc(sectionName(p.section))}</span>`,
      esc(statusLabel(p.status)),
      esc(p.session_count ?? 0),
      esc(p.mastered_at ? date(p.mastered_at) : '—'),
    ])
  );

  const sessions = rows(data, 'magia_sessions').sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)));
  const sessionsHtml = table(
    [t('colDate'), t('colExercise'), t('colDuration'), t('colRating'), t('colNote')],
    sessions.map((s) => [
      esc(dateTime(s.started_at)),
      esc(exerciseTitle(s.fokozat, s.section, s.exercise_key)),
      esc(s.duration_sec ? duration(s.duration_sec) : '—'),
      s.rating ? `<span class="gold">${'★'.repeat(Number(s.rating))}</span>` : '—',
      text([s.note, s.disturbances].filter(Boolean).join('\n')),
    ])
  );

  const journal = rows(data, 'magia_journal').sort((a, b) =>
    String(b.entry_date ?? b.created_at).localeCompare(String(a.entry_date ?? a.created_at))
  );
  const journalHtml =
    journal.length === 0
      ? empty
      : journal
          .map((j) => {
            const fields = JOURNAL_FIELDS.filter(([field]) => String(j[field] ?? '').trim())
              .map(([field, key]) => `<dt>${esc(tMagia(key))}</dt><dd>${text(j[field])}</dd>`)
              .join('');
            const meta = [j.exercise_key ? exerciseTitle(j.fokozat, j.section, j.exercise_key) : '', j.duration_sec ? duration(j.duration_sec) : '']
              .filter(Boolean)
              .join(' · ');
            return `<article class="entry"><h3>${esc(date(j.entry_date ?? j.created_at))}${meta ? ` <span class="muted">· ${esc(meta)}</span>` : ''}</h3><dl>${fields}</dl></article>`;
          })
          .join('');

  const mirror = rows(data, 'magia_soul_mirror');
  const mirrorTable = (kind: 'fekete' | 'feher') =>
    table(
      [t('colTrait'), t('colElement'), t('colIntensity'), t('colResolved')],
      mirror
        .filter((m) => m.mirror === kind)
        .map((m) => [
          esc(m.trait),
          esc(ELEMENT_KEYS[String(m.element)] ? tMagia(ELEMENT_KEYS[String(m.element)]) : '—'),
          esc(m.intensity ?? '—'),
          m.resolved ? '✓' : '',
        ])
    );

  const pathHtml = path ? buildPathHtml(data, path, { t, date, table, empty }) : '';

  const badgesHtml = table(
    [t('colMilestone'), t('colDate')],
    rows(data, 'user_badges')
      .filter((b) => BADGES.some((def) => def.id === b.badge_id))
      .map((b) => [esc(tBadges(`${b.badge_id}.title`)), esc(date(b.earned_at))])
  );

  const cards = rows(data, 'angol_card_progress');
  const exams = rows(data, 'angol_exam_results').filter((e) => e.passed);
  const angolHtml =
    cards.length || exams.length
      ? `<ul><li>${esc(t('learnedWords', { count: cards.filter((c) => Number(c.correct_count) >= 3).length }))}</li><li>${esc(
          t('passedExams', { count: exams.length })
        )}</li></ul>`
      : '';

  const section = (title: string, body: string) => `<section><h2>${esc(title)}</h2>${body}</section>`;

  return `<!doctype html>
<html lang="${esc(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t('title'))} — Quintessence</title>
<style>
  :root { --ink: #2A1F45; --muted: #6B5F80; --gold: #8C6A10; --line: #E2D6BE; --bg: #F7F2E7; --card: #FFFCF5; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.55 Georgia, 'Times New Roman', serif; }
  main { max-width: 860px; margin: 0 auto; padding: 40px 24px 64px; }
  header { border-bottom: 2px solid var(--gold); padding-bottom: 16px; margin-bottom: 28px; }
  .brand { letter-spacing: .3em; text-transform: uppercase; font-size: 12px; color: var(--gold); font-weight: bold; }
  h1 { margin: 6px 0 4px; font-size: 30px; }
  h2 { margin: 0 0 12px; font-size: 20px; color: var(--gold); }
  h3 { margin: 0 0 8px; font-size: 15px; }
  section { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 20px 22px; margin-bottom: 18px; break-inside: avoid-page; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); border-bottom: 1px solid var(--line); padding: 6px 8px; }
  td { border-bottom: 1px solid var(--line); padding: 7px 8px; vertical-align: top; }
  tr:last-child td { border-bottom: 0; }
  dl { margin: 0; display: grid; grid-template-columns: minmax(120px, 30%) 1fr; gap: 4px 14px; font-size: 14px; }
  dt { color: var(--muted); }
  dd { margin: 0; }
  .entry { padding: 12px 0; border-bottom: 1px solid var(--line); }
  .entry:last-child { border-bottom: 0; }
  .muted { color: var(--muted); font-weight: normal; }
  .gold { color: var(--gold); }
  .hint { color: var(--muted); font-size: 13px; }
  ul { margin: 0; padding-left: 18px; }
  @media print { body { background: #fff; } section { border-color: #ddd; } .hint { display: none; } }
</style>
</head>
<body>
<main>
<header>
  <div class="brand">Quintessence</div>
  <h1>${esc(t('title'))} — ${esc(fullName)}</h1>
  <div class="muted">${esc(t('generated', { date: dateTime(data.exportedAt) }))}</div>
  <p class="hint">${esc(t('printHint'))} ${esc(t('jsonHint'))}</p>
</header>
${section(
  t('account'),
  `<dl>
    <dt>${esc(t('fullName'))}</dt><dd>${esc(fullName)}</dd>
    <dt>${esc(t('username'))}</dt><dd>@${esc(account.username)}</dd>
    <dt>${esc(t('email'))}</dt><dd>${esc(account.email)}</dd>
    <dt>${esc(t('memberSince'))}</dt><dd>${esc(date(account.created_at))}</dd>
    <dt>${esc(t('language'))}</dt><dd>${esc(account.preferred_language)}</dd>
    <dt>${esc(t('pushDevicesLabel'))}</dt><dd>${esc(data.pushDevices)}</dd>
  </dl>`
)}
${pathHtml ? section(t('newPath'), pathHtml) : ''}
${section(t('magiaProgress'), progressHtml)}
${section(t('sessions'), sessionsHtml)}
${section(t('journal'), journalHtml)}
${section(
  t('soulMirror'),
  `<h3>${esc(tMagia('soulMirrorBlack'))}</h3>${mirrorTable('fekete')}<h3 style="margin-top:16px">${esc(tMagia('soulMirrorWhite'))}</h3>${mirrorTable('feher')}`
)}
${section(t('badges'), badgesHtml)}
${angolHtml ? section(t('angol'), angolHtml) : ''}
</main>
</body>
</html>`;
}

/** The new path: where it stands, the 14-day cycles, the evenings and the day notes. */
function buildPathHtml(
  data: ExportData,
  { tPath, traitNames, bodyLabels, thoughtStages }: PathTexts,
  h: { t: Translate; date: (iso: unknown) => string; table: (head: string[], body: string[][]) => string; empty: string }
) {
  const { t, date, table } = h;
  const p = rows(data, 'magia_path')[0];
  if (!p) return '';
  const own = rows(data, 'magia_user_traits');
  const ownOf = (key: string) => own.find((o) => `own:${o.id}` === key);
  const nameOf = (key: string) => (key.startsWith('own:') ? String(ownOf(key)?.name ?? key) : traitNames[key] ?? key);
  const mirrorOf = (key: string) => (key.startsWith('own:') ? ownOf(key)?.mirror : TRAIT_BY_KEY.get(key)?.mirror);

  const stage = Number(p.thought_stage);
  const body = (Array.isArray(p.body_plan) ? (p.body_plan as Row[]) : []).map((item) => {
    const days = Array.isArray(item.days) ? (item.days as number[]).map((d) => tPath(`body.d${d}`)).join(', ') : t('everyDay');
    return `${esc(item.label ?? bodyLabels[String(item.key)] ?? item.key)} <span class="muted">· ${esc(tPath(`dashboard.parts.${item.when}`))}, ${esc(days)}</span>`;
  });
  const summary = `<dl>
    <dt>${esc(t('colGrade'))}</dt><dd>${esc(tPath('header.fokozat', { roman: ROMAN_NUMERALS[Number(p.fokozat)] ?? String(p.fokozat) }))}</dd>
    <dt>${esc(t('pathGate'))}</dt><dd>${esc(date(p.gate_read_at))}</dd>
    <dt>${esc(t('pathWish'))}</dt><dd>${esc(p.wish ?? '—')}</dd>
    <dt>${esc(t('pathThought'))}</dt><dd>${esc(
      stage >= 3 ? t('pathThoughtDone') : `${thoughtStages[stage] ?? ''}, ${tPath('items.minutes', { minutes: Number(p.thought_minutes) })}`
    )}</dd>
    <dt>${esc(t('pathBreath'))}</dt><dd>${esc(tPath('items.breaths', { count: Number(p.breath_target) }))}</dd>
    <dt>${esc(t('pathBody'))}</dt><dd>${body.length ? body.join('<br>') : '—'}</dd>
  </dl>`;

  const cycles = rows(data, 'magia_cycles').sort((a, b) => Number(a.number) - Number(b.number));
  const cyclesHtml = table(
    [t('colCycle'), t('colStart'), t('colLength'), t('colClosed')],
    cycles.map((c) => [esc(c.number), esc(date(c.started_on)), esc(t('days', { count: Number(c.length_days) })), esc(c.closed_at ? date(c.closed_at) : t('open'))])
  );

  // One evening: the marked traits of a mirror, strongest first
  const marked = (ratings: Row, mirror: 'fekete' | 'feher') =>
    Object.entries(ratings)
      .filter(([key]) => mirrorOf(key) === mirror)
      .sort(([, a], [, b]) => (b === '?' ? 0 : Number(b)) - (a === '?' ? 0 : Number(a)))
      .map(([key, level]) => `${esc(nameOf(key))} ${esc(level)}`)
      .join(', ') || '—';
  const evenings = rows(data, 'magia_evenings')
    .filter((e) => e.completed_at)
    .sort((a, b) => String(b.obs_date).localeCompare(String(a.obs_date)));
  const eveningsHtml = evenings.length
    ? `<p class="muted">${esc(t('ratingLegend'))}</p>${table(
        [t('colDate'), tPath('evening.black'), tPath('evening.white')],
        evenings.map((e) => [esc(date(e.obs_date)), marked((e.ratings ?? {}) as Row, 'fekete'), marked((e.ratings ?? {}) as Row, 'feher')])
      )}`
    : h.empty;

  const notes = rows(data, 'magia_day_notes').sort((a, b) => String(b.noted_at ?? b.obs_date).localeCompare(String(a.noted_at ?? a.obs_date)));
  const notesHtml = table(
    [t('colDate'), t('colTrait'), t('colNote')],
    notes.map((n) => [esc(date(n.obs_date)), esc(nameOf(String(n.trait_key))), text(n.note ?? '')])
  );

  return `${summary}<h3 style="margin-top:16px">${esc(t('cycles'))}</h3>${cyclesHtml}<h3 style="margin-top:16px">${esc(
    t('evenings')
  )}</h3>${eveningsHtml}<h3 style="margin-top:16px">${esc(t('dayNotes'))}</h3>${notesHtml}`;
}

export function downloadHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Safari cancels the download if the URL is revoked immediately
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
