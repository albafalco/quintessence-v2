import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { hasModuleAccess } from '@/lib/module-access';
import { formatFullName, nextNameChangeAt } from '@/lib/person-name';
import { DEFAULT_MAGIA_EVENING_PUSH_TIME, DEFAULT_MAGIA_PUSH_TIME } from '@/lib/locale-meta';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'profile' });
  return { title: t('settingsTitle') };
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('profile');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect(`/${locale}/auth/login`);

  const [angolAccess, { data: pendingName }] = await Promise.all([
    hasModuleAccess(supabase, 'angol'),
    supabase.from('name_change_requests').select('first_name, last_name').eq('user_id', user.id).maybeSingle(),
  ]);

  return (
    <div className="space-y-8">
      <header className="mx-auto max-w-4xl">
        <h1 className="font-display text-4xl font-bold text-gradient-gold">{t('settingsTitle')}</h1>
      </header>
      <SettingsForm
        angolAccess={angolAccess}
        pendingName={pendingName ?? null}
        nextNameChangeAt={nextNameChangeAt(profile.name_changed_at ?? null)}
        profile={{
          id: profile.id,
          name: formatFullName(profile.first_name, profile.last_name, locale),
          first_name: profile.first_name,
          last_name: profile.last_name,
          username: profile.username,
          email: user.email ?? '',
          preferred_language: profile.preferred_language,
          push_enabled: profile.push_enabled ?? false,
          push_magia_reminders: profile.push_magia_reminders ?? true,
          push_magia_time: profile.push_magia_time ?? DEFAULT_MAGIA_PUSH_TIME,
          push_magia_evening: profile.push_magia_evening ?? true,
          push_magia_evening_time: profile.push_magia_evening_time ?? DEFAULT_MAGIA_EVENING_PUSH_TIME,
          push_magia_streak: profile.push_magia_streak ?? true,
          push_magia_streak_time: profile.push_magia_streak_time ?? '20:30',
          push_magia_reengagement: profile.push_magia_reengagement ?? true,
          push_angol_reminders: profile.push_angol_reminders ?? true,
          push_angol_time: profile.push_angol_time ?? '20:00',
        }}
      />
    </div>
  );
}
