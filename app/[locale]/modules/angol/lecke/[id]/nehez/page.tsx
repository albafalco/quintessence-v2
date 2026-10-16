import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { HardItemsSession } from '@/components/angol/HardItemsSession';
import type { HardItem } from '@/lib/angol-hard';

interface HardItemsPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function HardItemsPage({ params }: HardItemsPageProps) {
  const { locale, id } = await params;
  const lessonId = parseInt(id, 10);
  if (locale !== 'hu') notFound();
  if (isNaN(lessonId) || lessonId !== 1) notFound();

  const t = await getTranslations('angol');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // Table from migration 009 — an error before that just means an empty list
  const { data } = await supabase
    .from('angol_hard_items')
    .select('id, lesson_id, section_id, kind, prompt, answer, wrong_count, correct_streak')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .order('wrong_count', { ascending: false })
    .order('last_wrong_at', { ascending: false });
  const items = (data ?? []) as HardItem[];
  const backHref = `/${locale}/modules/angol/lecke/${lessonId}`;

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6">
      <header className="space-y-2">
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
          {t('backToSections')}
        </Link>
        <h1 className="font-display text-2xl font-bold text-primary">⚠ {t('hardTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('hardDescription')}</p>
      </header>
      <HardItemsSession initialItems={items} backHref={backHref} />
    </div>
  );
}
