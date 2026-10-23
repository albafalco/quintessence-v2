import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { loadFeherMagia } from '@/lib/i18n-content';
import { loadPath } from '@/lib/magia/store';
import type { Locale } from '@/i18n';
import { GateReader } from '@/components/feher-magia/GateReader';

/** The earlier module's first exercise (Gondolatellenőrzés, started at 5 minutes) */
const OLD_THOUGHT_KEY = 'szellem_1_gondolatellenorzes';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'feherMagia.gate' });
  return { title: t('title') };
}

export default async function KapuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const [content, path, { data: profile }, { data: previous }] = await Promise.all([
    loadFeherMagia(locale as Locale),
    loadPath(supabase, user.id),
    supabase
      .from('profiles')
      .select('push_enabled, push_magia_reminders, push_magia_time, push_magia_evening_time')
      .eq('id', user.id)
      .maybeSingle(),
    // The earlier module's thought observation: where it got to (offered once, before the Gate is read)
    supabase
      .from('magia_sessions')
      .select('duration_sec')
      .eq('user_id', user.id)
      .eq('exercise_key', OLD_THOUGHT_KEY)
      .eq('completed', true)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const previousMinutes = previous?.duration_sec ? Math.min(10, Math.max(1, Math.floor(previous.duration_sec / 60))) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <GateReader
        locale={locale}
        userId={user.id}
        pages={content.gate.pages}
        source={content.source}
        timeQuote={content.gate.timeQuote}
        readOnly={Boolean(path?.gate_read_at)}
        initialMorning={profile?.push_magia_time ?? '06:30'}
        initialEvening={profile?.push_magia_evening_time ?? '21:30'}
        initialReminder={Boolean(profile?.push_enabled && profile?.push_magia_reminders)}
        previousMinutes={path?.gate_read_at ? null : previousMinutes}
      />
    </div>
  );
}
