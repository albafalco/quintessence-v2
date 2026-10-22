import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { hasModuleAccess } from '@/lib/module-access';
import { loadFeherMagia } from '@/lib/i18n-content';
import { loadPath } from '@/lib/magia/store';
import type { Locale } from '@/i18n';
import { GateReader } from '@/components/feher-magia/GateReader';

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
  // The new path is visible only with access until the switch (step 7)
  if (!(await hasModuleAccess(supabase, 'feher_magia'))) redirect(`/${locale}/modules/magia`);

  const [content, path, { data: profile }] = await Promise.all([
    loadFeherMagia(locale as Locale),
    loadPath(supabase, user.id),
    supabase
      .from('profiles')
      .select('push_enabled, push_magia_reminders, push_magia_time, push_magia_evening_time')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

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
      />
    </div>
  );
}
