import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Flame, GraduationCap, Hourglass, PenLine, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { hasModuleAccess } from '@/lib/module-access';
import { formatFullName } from '@/lib/person-name';
import { loadBadgeStats } from '@/lib/badges-sync';
import { toIntlLocale } from '@/i18n';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { BadgesSection } from '@/components/profile/BadgesSection';
import { InvitesCard } from '@/components/profile/InvitesCard';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'profile' });
  return { title: t('title') };
}

function Stat({ icon: Icon, value, label }: { icon: typeof Flame; value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 rounded-2xl border border-border/50 bg-card/40 px-2 py-4 text-center">
      <Icon className="h-5 w-5 text-accent" />
      <span className="font-display text-xl font-bold text-cream sm:text-2xl">{value}</span>
      <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}

/** "Me and my path": who I am and how far I got. Settings live on /beallitasok. */
export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('profile');
  const tDash = await getTranslations('dashboard');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const [{ data: profile }, { data: adminRow }, angolAccess, stats] = await Promise.all([
    supabase.from('profiles').select('first_name, last_name, name, username, created_at').eq('id', user.id).single(),
    supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    hasModuleAccess(supabase, 'angol'),
    loadBadgeStats(supabase, user.id),
  ]);
  if (!profile) redirect(`/${locale}/auth/login`);

  const name = profile.first_name && profile.last_name ? formatFullName(profile.first_name, profile.last_name, locale) : profile.name;
  const memberSince = profile.created_at
    ? new Intl.DateTimeFormat(toIntlLocale(locale), { year: 'numeric', month: 'long' }).format(new Date(profile.created_at))
    : null;
  const hours = Math.floor(stats.totalPracticeSec / 3600);
  const minutes = Math.floor((stats.totalPracticeSec % 3600) / 60);
  const practice = hours > 0 ? t('statHours', { count: hours }) : t('statMinutes', { count: minutes });
  const showAngol = locale === 'hu' && angolAccess;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent/70">{t('profileEyebrow')}</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-gradient-gold">{t('title')}</h1>
      </header>

      <section className="premium-card flex items-center gap-4 p-5 sm:p-6">
        <UserAvatar username={profile.username} name={name} className="h-16 w-16 text-2xl" />
        {/* The name and the date wrap instead of being cut */}
        <div className="min-w-0 flex-1">
          <p className="break-words font-display text-xl font-semibold leading-snug text-cream">{name}</p>
          <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
          {memberSince && <p className="text-xs text-muted-foreground/80">{t('memberSince', { date: memberSince })}</p>}
        </div>
        {/* A phone: only the pencil; wider screens: with the label */}
        <Link
          href={`/${locale}/beallitasok#fiok`}
          aria-label={t('editProfile')}
          title={t('editProfile')}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-full border border-accent/30 text-xs font-semibold text-accent transition hover:bg-accent/10 sm:h-auto sm:w-auto sm:rounded-xl sm:px-3 sm:py-1.5"
        >
          <PenLine className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">{t('editProfile')}</span>
        </Link>
      </section>

      <section className={showAngol ? 'grid grid-cols-2 gap-3 sm:grid-cols-4' : 'grid grid-cols-3 gap-3'}>
        <Stat icon={Flame} value={tDash('momentumStreakValue', { count: stats.longestStreak })} label={t('statStreak')} />
        <Stat icon={Hourglass} value={practice} label={t('statPractice')} />
        <Stat icon={Star} value={String(stats.masteredExercises)} label={t('statMastered')} />
        {showAngol && <Stat icon={GraduationCap} value={String(stats.learnedWords)} label={t('statWords')} />}
      </section>

      <BadgesSection userId={user.id} />
      {/* Admins invite from the admin area */}
      {!adminRow && <InvitesCard />}
    </div>
  );
}
