import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RegisterForm } from '@/components/auth/RegisterForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  const tBrand = await getTranslations({ locale, namespace: 'brand' });
  return { title: `${t('register')} | ${tBrand('name')}` };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <Card className="glass-strong border-border/50 shadow-glow">
      <CardHeader className="text-center pb-2">
        <CardTitle className="font-display text-xl text-cream">{t('createAccount')}</CardTitle>
        <CardDescription>{t('register')}</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}