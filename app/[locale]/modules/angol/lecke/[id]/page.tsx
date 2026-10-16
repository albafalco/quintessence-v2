import Link from 'next/link';
import { BookOpen, CheckCircle, ChevronRight, Circle, Lock, PlayCircle } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { loadAngolLesson1 } from '@/lib/angol-lecke1';
import { ALL_SECTION_IDS, getNextSectionId, getSectionLabels, isSectionUnlocked } from '@/lib/angol-unlocks';
import { getHardItemCount, getLearnedWordCount, getPassedSectionIds, getUnlockedSectionIds } from '@/lib/angol-db';
import vocabulary from '@/messages/content/angol-vocabulary.json';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n';

const VOCABULARY_SIZE = (vocabulary as unknown[]).length;

/** done: exam passed · next: where to continue · available: open · reading: basics (no exam) */
type SectionState = 'done' | 'next' | 'available' | 'reading' | 'locked';

interface LeckePageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function LeckePage({ params }: LeckePageProps) {
  const { locale, id } = await params;
  const lessonId = parseInt(id, 10);

  if (locale !== 'hu') notFound();
  if (isNaN(lessonId) || lessonId !== 1) notFound();

  const t = await getTranslations('angol');
  const lessonContent = await loadAngolLesson1(locale as Locale);
  const sectionLabels = getSectionLabels(lessonContent);
  const lesson = lessonContent.lessons.find((l) => l.id === lessonId);
  const [unlockedIds, passedIds, hardCount, learnedWords] = await Promise.all([
    getUnlockedSectionIds(lessonId),
    getPassedSectionIds(lessonId),
    getHardItemCount(lessonId),
    getLearnedWordCount(lessonId),
  ]);
  const practiceSections = lessonContent.practice.map((s) => s.id);

  // A practice section is done when its exam was passed — or when the next one
  // is already open (unlocks before the exam log existed)
  const isDone = (sectionId: number) => {
    const next = getNextSectionId(sectionId);
    return passedIds.includes(sectionId) || (next !== null && unlockedIds.includes(next));
  };
  const nextSectionId = practiceSections.find((sid) => isSectionUnlocked(sid, unlockedIds) && !isDone(sid));
  const practiceState = (sectionId: number): SectionState => {
    if (!isSectionUnlocked(sectionId, unlockedIds)) return 'locked';
    if (isDone(sectionId)) return 'done';
    return sectionId === nextSectionId ? 'next' : 'available';
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-8">
      <header className="space-y-2">
        <Link
          href={`/${locale}/modules/angol`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t('backToLessons')}
        </Link>
        <h1 className="font-display text-3xl font-bold text-primary">
          {lesson?.title}
        </h1>
        <p className="text-muted-foreground">
          {t('lesson1Description')}
        </p>
      </header>

      {hardCount > 0 && (
        <Link
          href={`/${locale}/modules/angol/lecke/${lessonId}/nehez`}
          className="group flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 transition-colors hover:border-amber-400/50 hover:bg-amber-500/10"
        >
          <span className="text-lg">⚠</span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-amber-200">{t('hardTitle')} ({hardCount})</p>
            <p className="text-xs text-muted-foreground">{t('hardTileHint')}</p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-amber-300/70" />
        </Link>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t('basics')}
        </h2>
        {ALL_SECTION_IDS.filter((sid) => sid < 5).map((sectionId) => (
          <SectionLink
            key={sectionId}
            locale={locale}
            lessonId={lessonId}
            sectionId={sectionId}
            label={sectionLabels[sectionId]}
            state={isSectionUnlocked(sectionId, unlockedIds) ? 'reading' : 'locked'}
            hint={sectionId === 0 ? t('wordsLearned', { learned: learnedWords, total: VOCABULARY_SIZE }) : undefined}
            lockedLabel={t('locked')}
            nextLabel={t('sectionNext')}
            doneLabel={t('sectionDone')}
          />
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t('practiceSections')}
        </h2>
        {practiceSections.map((sectionId) => (
          <SectionLink
            key={sectionId}
            locale={locale}
            lessonId={lessonId}
            sectionId={sectionId}
            label={sectionLabels[sectionId]}
            state={practiceState(sectionId)}
            lockedLabel={t('locked')}
            nextLabel={t('sectionNext')}
            doneLabel={t('sectionDone')}
          />
        ))}
      </div>
    </div>
  );
}

const STATE_ICON = {
  done: <CheckCircle size={18} className="shrink-0 text-green-500" />,
  next: <PlayCircle size={18} className="shrink-0 text-accent" />,
  available: <Circle size={18} className="shrink-0 text-muted-foreground" />,
  reading: <BookOpen size={18} className="shrink-0 text-muted-foreground" />,
} as const;

function SectionLink({
  locale,
  lessonId,
  sectionId,
  label,
  state,
  hint,
  lockedLabel,
  nextLabel,
  doneLabel,
}: {
  locale: string;
  lessonId: number;
  sectionId: number;
  label: string;
  state: SectionState;
  /** Small text on the right (e.g. learned words) */
  hint?: string;
  lockedLabel: string;
  nextLabel: string;
  doneLabel: string;
}) {
  if (state === 'locked') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-4 opacity-50">
        <Lock size={18} className="text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-muted-foreground truncate">{label}</p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{lockedLabel}</span>
      </div>
    );
  }

  return (
    <Link
      href={`/${locale}/modules/angol/lecke/${lessonId}/szakasz/${sectionId}`}
      className={cn(
        'group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/5',
        state === 'next' ? 'border-accent/50 shadow-glow-gold' : 'border-border'
      )}
    >
      {STATE_ICON[state]}
      {state === 'done' && <span className="sr-only">{doneLabel}</span>}
      <div className="flex-1 min-w-0">
        <p className="font-medium group-hover:text-primary truncate">{label}</p>
      </div>
      {state === 'next' && (
        <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">{nextLabel}</span>
      )}
      {hint && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{hint}</span>}
      <ChevronRight
        size={18}
        className="text-muted-foreground group-hover:text-primary shrink-0"
      />
    </Link>
  );
}
