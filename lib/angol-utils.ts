export type AnswerResult = 'correct' | 'partial' | 'incorrect';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[.,!?;:"“”()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Typo tolerance only for longer answers — on short words one edit turns
 *  a correct answer into a different word (he/the, is/it, my/me). */
const MIN_LENGTH_FOR_TYPO_TOLERANCE = 5;

export interface EvaluateOptions {
  /** Vocabulary cards list synonyms separated by commas ("a, an"); in
   *  sentences the comma is just punctuation and must not be split on. */
  commaSeparatedAlternatives?: boolean;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

export function getAcceptedAnswers(correctEn: string, options: EvaluateOptions = {}): string[] {
  // Alternative full sentences are separated by sentence boundaries:
  // "He is here, too. He is also here."
  // Parentheses mark optional words ("sure (of it)", "a little (bit)") or
  // learner hints ("(ha hölgy mondja)") — accept the answer with and without them.
  const variants = [correctEn.replace(/\([^)]*\)/g, ' '), correctEn];
  const parts = variants.flatMap((variant) => {
    const sentences = variant.split(/(?<=[.!?])\s+/);
    const pieces = options.commaSeparatedAlternatives
      ? sentences.flatMap((s) => s.split(','))
      : sentences;
    return [variant, ...pieces];
  });
  return Array.from(new Set(parts.map((part) => normalize(part)).filter(Boolean)));
}

export function evaluateAnswer(
  userAnswer: string,
  correctEn: string,
  options: EvaluateOptions = {}
): AnswerResult {
  const normalized = normalize(userAnswer);
  if (!normalized) return 'incorrect';

  const accepted = getAcceptedAnswers(correctEn, options);

  for (const answer of accepted) {
    if (normalized === answer) return 'correct';
    if (
      answer.length >= MIN_LENGTH_FOR_TYPO_TOLERANCE &&
      levenshtein(normalized, answer) <= 1
    ) {
      return 'correct';
    }
  }

  // Partial: answer without article when full answer has article
  for (const answer of accepted) {
    const withoutArticle = answer.replace(/^(a|an|the)\s+/, '');
    if (normalized === withoutArticle) return 'partial';
  }

  return 'incorrect';
}

export function scoreExam(
  answers: { user: string; correct: string }[],
  options: EvaluateOptions = {}
): { correct: number; partial: number; incorrect: number; percent: number } {
  let correct = 0;
  let partial = 0;
  let incorrect = 0;

  for (const { user, correct: c } of answers) {
    const result = evaluateAnswer(user, c, options);
    if (result === 'correct') correct++;
    else if (result === 'partial') partial++;
    else incorrect++;
  }

  const total = answers.length;
  const percent = total > 0 ? Math.round(((correct + partial * 0.5) / total) * 100) : 0;
  return { correct, partial, incorrect, percent };
}

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ── Pronunciation scoring ────────────────────────────────────────────────────

const CONTRACTIONS: [RegExp, string][] = [
  [/n't\b/g, ' not'],
  [/'re\b/g, ' are'],
  [/'m\b/g, ' am'],
  [/'ll\b/g, ' will'],
  [/'ve\b/g, ' have'],
  [/'d\b/g, ' would'],
  [/'s\b/g, ' is'],
];

/** Lowercase tokens with contractions expanded ("He's" → ["he", "is"]). */
function pronunciationTokens(text: string): string[] {
  let s = text.toLowerCase().replace(/[’‘`]/g, "'");
  s = s
    .replace(/\bcan't\b/g, 'can not')
    .replace(/\bcannot\b/g, 'can not')
    .replace(/\bwon't\b/g, 'will not');
  for (const [re, rep] of CONTRACTIONS) s = s.replace(re, rep);
  return s.replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
}

export interface PronunciationScore {
  /** 0–100: share of the target's words recognised, in order */
  score: number;
  /** Target words as written, with whether each was recognised */
  words: { text: string; matched: boolean }[];
}

export function scorePronunciation(target: string, heard: string): PronunciationScore {
  const original = target.replace(/\([^)]*\)/g, ' ').split(/\s+/).filter(Boolean);
  const targetTokens: { token: string; word: number }[] = [];
  original.forEach((word, i) => pronunciationTokens(word).forEach((token) => targetTokens.push({ token, word: i })));
  const heardTokens = pronunciationTokens(heard);

  // Longest common subsequence → which target tokens were heard in order
  const n = targetTokens.length;
  const m = heardTokens.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = targetTokens[i].token === heardTokens[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matched = new Set<number>();
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (targetTokens[i].token === heardTokens[j]) {
      matched.add(i);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }

  const words = original
    .map((text, i) => {
      const indices = targetTokens.map((t, k) => (t.word === i ? k : -1)).filter((k) => k >= 0);
      return { text, matched: indices.length > 0 && indices.every((k) => matched.has(k)), hasTokens: indices.length > 0 };
    })
    .filter((w) => w.hasTokens)
    .map(({ text, matched: ok }) => ({ text, matched: ok }));

  return { score: n === 0 ? 0 : Math.round((matched.size / n) * 100), words };
}
