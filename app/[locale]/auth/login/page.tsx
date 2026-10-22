import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/LoginForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('login') };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { locale } = await params;
  const { deleted } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <Card className="glass-strong border-border/50 shadow-glow">
      <CardHeader className="text-center pb-2">
        <CardTitle className="font-display text-xl text-cream">{t('welcomeBack')}</CardTitle>
        <CardDescription>{t('login')}</CardDescription>
      </CardHeader>
      <CardContent>
        {deleted === '1' && (
          <p className="mb-4 rounded-xl border border-accent/25 bg-accent/5 px-3 py-2.5 text-center text-sm text-cream/90">
            {t('accountDeleted')}
          </p>
        )}
        <LoginForm />
      </CardContent>
    </Card>
  );
}