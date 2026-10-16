import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NewPasswordForm } from '@/components/auth/NewPasswordForm';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  const tBrand = await getTranslations({ locale, namespace: 'brand' });
  return { title: `${t('newPasswordTitle')} | ${tBrand('name')}`, robots: { index: false } };
}

/** Landing page of the admin-issued password reset link (?token_hash=…&type=recovery). */
export default async function NewPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { locale } = await params;
  const { token_hash, type } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <Card className="glass-strong border-border/50 shadow-glow">
      <CardHeader className="text-center pb-2">
        <CardTitle className="font-display text-xl text-cream">{t('newPasswordTitle')}</CardTitle>
        <CardDescription>{t('newPasswordDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <NewPasswordForm tokenHash={type === 'recovery' && token_hash ? token_hash : null} />
      </CardContent>
    </Card>
  );
}
