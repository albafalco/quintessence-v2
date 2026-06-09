import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { MAGIA_FOKOZATOK } from '@/lib/magia-data';
import { FokozatTabs } from '@/components/magia/FokozatTabs';
import { JournalSection } from '@/components/magia/JournalSection';
import { ProgressRing } from '@/components/magia/ProgressRing';
import { ROMAN_NUMERALS, getFokozatProgress, isFokozatUnlocked } from '@/lib/magia-utils';
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

  // Minden progress kell az unlock-ellenőrzéshez
  const [{ data: allProgressData }, { data: journalData }] = await Promise.all([
    supabase
      .from('magia_progress')
      .select('fokozat, section, exercise_key, completed, notes, status, mastered_at, session_count')
      .eq('user_id', user.id),
    supabase
      .from('magia_journal')
      .select('id, fokozat, entry_date, content, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('fokozat', fokozatId)
      .order('entry_date', { ascending: false }),
  ]);

  const allProgress = (allProgressData ?? []) as MagiaProgressRecord[];
  const progress = allProgress.filter((p) => p.fokozat === fokozatId);
  const journalEntries = (journalData ?? []) as JournalEntryData[];

  if (!isFokozatUnlocked(fokozatId, allProgress)) {
    redirect(`/${locale}/modules/magia`);
  }

  const fokozatProgress = getFokozatProgress(fokozatId, progress);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <Link
        href={`/${locale}/modules/magia`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-accent"
      >
        ← {t('back')}
      </Link>

      <header className="premium-card magia-surface flex items-start gap-5 p-6 md:p-8">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-4xl"
          style={{ background: `${fokozat.szin}18`, border: `1px solid ${fokozat.szin}33` }}
        >
          {fokozat.icon}
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">
            {ROMAN_NUMERALS[fokozatId]}. {t('fokozat')}
          </p>
          <h1 className="font-display text-3xl font-bold md:text-4xl" style={{ color: fokozat.szin }}>
            {fokozat.cim}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('duration')}: {fokozat.idotartam}
          </p>
        </div>
        <ProgressRing
          progress={fokozatProgress.percent}
          color={fokozat.szin}
          size={80}
          strokeWidth={4}
        />
      </header>

      <div className="rounded-2xl border border-primary/15 bg-magia-gradient p-6">
        <p className="text-sm leading-relaxed text-cream/85">{fokozat.osszefoglalo}</p>
      </div>

        <FokozatTabs
          fokozatId={fokozatId}
          nextFokozatTitle={MAGIA_FOKOZATOK.find((f) => f.id === fokozatId + 1)?.cim}
          szellem={fokozat.szellem}
          lelek={fokozat.lelek}
          test={fokozat.test}
          progress={progress}
          userId={user.id}
        />

      <div className="border-t border-border/40 pt-10" />

      <JournalSection
        fokozatId={fokozatId}
        userId={user.id}
        initialEntries={journalEntries}
      />
    </div>
  );
}