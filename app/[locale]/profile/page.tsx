import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from '@/components/profile/ProfileForm';

interface ProfilePageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  const t = await getTranslations('profile');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect(`/${locale}/auth/login`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent/70">Beállítások</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-gradient-gold">{t('title')}</h1>
      </header>
        <ProfileForm
          profile={{
            id: profile.id,
            name: profile.name,
            username: profile.username,
            email: user.email ?? '',
            preferred_language: profile.preferred_language,
            push_enabled: profile.push_enabled ?? false,
            push_magia_reminders: profile.push_magia_reminders ?? true,
            push_magia_time: profile.push_magia_time ?? '08:00',
            push_magia_evening: profile.push_magia_evening ?? true,
            push_magia_evening_time: profile.push_magia_evening_time ?? '19:00',
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