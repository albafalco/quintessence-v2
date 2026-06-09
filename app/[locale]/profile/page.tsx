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
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 font-display text-3xl font-bold">{t('title')}</h1>
        <ProfileForm
          profile={{
            id: profile.id,
            name: profile.name,
            username: profile.username,
            email: user.email ?? '',
            preferred_language: profile.preferred_language,
            push_enabled: profile.push_enabled ?? false,
            push_magia_reminders: profile.push_magia_reminders ?? true,
            push_angol_reminders: profile.push_angol_reminders ?? true,
            push_magia_time: profile.push_magia_time ?? '08:00',
            push_angol_time: profile.push_angol_time ?? '18:00',
          }}
        />
      </div>
    </div>
  );
}