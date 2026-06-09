import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { MAGIA_FOKOZATOK } from '@/lib/magia-data';
import { FokozatTabs } from '@/components/magia/FokozatTabs';
import { JournalSection } from '@/components/magia/JournalSection';
import { ProgressRing } from '@/components/magia/ProgressRing';
import { ROMAN_NUMERALS, getFokozatProgress } from '@/lib/magia-utils';
import type { JournalEntryData } from '@/components/magia/JournalEntry';
import type { MagiaProgressRecord } from '@/lib/magia-utils';

interface FokozatPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function FokozatPage({ params }: FokozatPageProps) {
  const { locale, id } = await params;
  const fokozatId = parseInt(id, 10);

  if (isNaN(fokozatId) || fokozatId < 1 || fokozatId > 10) {
    notFound();
  }

  const fokozat = MAGIA_FOKOZATOK.find((f) => f.id === fokozatId);
  if (!fokozat) notFound();

  const t = await getTranslations('magia');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const [{ data: progressData }, { data: journalData }] = await Promise.all([
    supabase
      .from('magia_progress')
      .select('fokozat, section, exercise_key, completed, notes')
      .eq('user_id', user.id)
      .eq('fokozat', fokozatId),
    supabase
      .from('magia_journal')
      .select('id, fokozat, entry_date, content, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('fokozat', fokozatId)
      .order('entry_date', { ascending: false }),
  ]);

  const progress = (progressData ?? []) as MagiaProgressRecord[];
  const journalEntries = (journalData ?? []) as JournalEntryData[];
  const fokozatProgress = getFokozatProgress(fokozatId, progress);

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/${locale}/modules/magia`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← {t('back')}
        </Link>

        <header className="mb-8 flex items-start gap-4">
          <span className="text-4xl" role="img" aria-hidden>
            {fokozat.icon}
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {ROMAN_NUMERALS[fokozatId]}. {t('fokozat')}
            </p>
            <h1
              className="font-display text-3xl font-bold"
              style={{ color: fokozat.szin }}
            >
              {fokozat.cim}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('duration')}: {fokozat.idotartam}
            </p>
          </div>
          <ProgressRing
            progress={fokozatProgress.percent}
            color={fokozat.szin}
            size={72}
            strokeWidth={4}
          />
        </header>

        <div className="mb-8 rounded-lg border border-border bg-card/30 p-4">
          <p className="text-sm leading-relaxed text-foreground/90">
            {fokozat.osszefoglalo}
          </p>
        </div>

        <FokozatTabs
          fokozatId={fokozatId}
          szellem={fokozat.szellem}
          lelek={fokozat.lelek}
          test={fokozat.test}
          progress={progress}
          userId={user.id}
        />

        <div className="my-12 border-t border-border" />

        <JournalSection
          fokozatId={fokozatId}
          userId={user.id}
          initialEntries={journalEntries}
        />
      </div>
    </div>
  );
}