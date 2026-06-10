import Link from 'next/link';
import { Lock, CheckCircle, ChevronRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { loadAngolLesson1 } from '@/lib/angol-lecke1';
import { ALL_SECTION_IDS, getSectionLabels, isSectionUnlocked } from '@/lib/angol-unlocks';
import { getUnlockedSectionIds } from '@/lib/angol-db';
import type { Locale } from '@/i18n';

interface LeckePageProps {
  params: { locale: string; id: string };
}

export default async function LeckePage({ params }: LeckePageProps) {
  const { locale, id } = params;
  const lessonId = parseInt(id, 10);

  if (locale !== 'hu') notFound();
  if (isNaN(lessonId) || lessonId !== 1) notFound();

  const t = await getTranslations('angol');
  const lessonContent = await loadAngolLesson1(locale as Locale);
  const sectionLabels = getSectionLabels(lessonContent);
  const lesson = lessonContent.lessons.find((l) => l.id === lessonId);
  const unlockedIds = await getUnlockedSectionIds(lessonId);
  const practiceSections = lessonContent.practice.map((s) => s.id);

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

      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t('basics')}
        </h2>
        {ALL_SECTION_IDS.filter((sid) => sid < 5).map((sectionId) => {
          const unlocked = isSectionUnlocked(sectionId, unlockedIds);
          const label = sectionLabels[sectionId];

          return (
            <SectionLink
              key={sectionId}
              locale={locale}
              lessonId={lessonId}
              sectionId={sectionId}
              label={label}
              unlocked={unlocked}
              lockedLabel={t('locked')}
            />
          );
        })}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t('practiceSections')}
        </h2>
        {practiceSections.map((sectionId) => {
          const unlocked = isSectionUnlocked(sectionId, unlockedIds);
          const label = sectionLabels[sectionId];

          return (
            <SectionLink
              key={sectionId}
              locale={locale}
              lessonId={lessonId}
              sectionId={sectionId}
              label={label}
              unlocked={unlocked}
              lockedLabel={t('locked')}
            />
          );
        })}
      </div>
    </div>
  );
}

function SectionLink({
  locale,
  lessonId,
  sectionId,
  label,
  unlocked,
  lockedLabel,
}: {
  locale: string;
  lessonId: number;
  sectionId: number;
  label: string;
  unlocked: boolean;
  lockedLabel: string;
}) {
  if (!unlocked) {
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
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <CheckCircle size={18} className="text-green-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium group-hover:text-primary truncate">{label}</p>
      </div>
      <ChevronRight
        size={18}
        className="text-muted-foreground group-hover:text-primary shrink-0"
      />
    </Link>
  );
}