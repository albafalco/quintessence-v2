export type AnswerResult = 'correct' | 'partial' | 'incorrect';

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
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

export function getAcceptedAnswers(correctEn: string): string[] {
  return correctEn.split(',').map((part) => normalize(part));
}

export function evaluateAnswer(userAnswer: string, correctEn: string): AnswerResult {
  const normalized = normalize(userAnswer);
  if (!normalized) return 'incorrect';

  const accepted = getAcceptedAnswers(correctEn);

  for (const answer of accepted) {
    if (normalized === answer) return 'correct';
    if (levenshtein(normalized, answer) <= 1) return 'correct';
  }

  // Partial: answer without article when full answer has article
  for (const answer of accepted) {
    const withoutArticle = answer.replace(/^(a|an|the)\s+/, '');
    if (normalized === withoutArticle) return 'partial';
  }

  return 'incorrect';
}

export function scoreExam(
  answers: { user: string; correct: string }[]
): { correct: number; partial: number; incorrect: number; percent: number } {
  let correct = 0;
  let partial = 0;
  let incorrect = 0;

  for (const { user, correct: c } of answers) {
    const result = evaluateAnswer(user, c);
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