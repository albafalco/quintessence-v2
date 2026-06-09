import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { LECKE_1_SZAKASZOK } from '@/lib/angol-lecke1';
import { SECTION_LABELS, isSectionUnlocked } from '@/lib/angol-unlocks';
import { getLastExamResult, getUnlockedSectionIds } from '@/lib/angol-db';
import { SzakaszView } from '@/components/angol/SzakaszView';

interface SzakaszPageProps {
  params: { locale: string; id: string; sid: string };
}

export default async function SzakaszPage({ params }: SzakaszPageProps) {
  const { locale, id, sid } = params;
  const lessonId = parseInt(id, 10);
  const sectionId = parseInt(sid, 10);

  if (locale !== 'hu') notFound();
  if (isNaN(lessonId) || lessonId !== 1) notFound();
  if (isNaN(sectionId)) notFound();

  const validSections = [0, 1, 2, ...LECKE_1_SZAKASZOK.map((s) => s.id)];
  if (!validSections.includes(sectionId)) notFound();

  const unlockedIds = await getUnlockedSectionIds(lessonId);
  if (!isSectionUnlocked(sectionId, unlockedIds)) {
    redirect(`/${locale}/modules/angol/lecke/${lessonId}`);
  }

  const szakasz = LECKE_1_SZAKASZOK.find((s) => s.id === sectionId);
  const sectionName = SECTION_LABELS[sectionId] ?? `Szakasz ${sectionId}`;
  const lastExam = sectionId >= 5 ? await getLastExamResult(lessonId, sectionId) : null;

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6">
      <header className="space-y-2">
        <Link
          href={`/${locale}/modules/angol/lecke/${lessonId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Szakaszok
        </Link>
        <h1 className="font-display text-2xl font-bold text-primary">
          {sectionName}
        </h1>
      </header>

      <SzakaszView
        lessonId={lessonId}
        sectionId={sectionId}
        sectionName={sectionName}
        szakasz={szakasz}
        locale={locale}
        lastExamScore={lastExam?.score ?? null}
        lastExamPassed={lastExam?.passed ?? false}
      />
    </div>
  );
}