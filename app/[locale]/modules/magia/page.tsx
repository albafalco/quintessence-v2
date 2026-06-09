import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { MAGIA_FOKOZATOK } from '@/lib/magia-data';
import { FokozatCard } from '@/components/magia/FokozatCard';
import type { MagiaProgressRecord } from '@/lib/magia-utils';

interface MagiaPageProps {
  params: Promise<{ locale: string }>;
}

export default async function MagiaPage({ params }: MagiaPageProps) {
  const { locale } = await params;
  const t = await getTranslations('magia');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let progress: MagiaProgressRecord[] = [];

  if (user) {
    const { data } = await supabase
      .from('magia_progress')
      .select('fokozat, section, exercise_key, completed, notes')
      .eq('user_id', user.id);

    progress = (data ?? []) as MagiaProgressRecord[];
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MAGIA_FOKOZATOK.map((fokozat) => (
            <FokozatCard
              key={fokozat.id}
              fokozat={fokozat}
              locale={locale}
              progress={progress}
            />
          ))}
        </div>
      </div>
    </div>
  );
}