import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { createClient } from '@/lib/supabase/server';

interface InvitePreview {
  inviter_name: string | null;
  message: string | null;
  email_hint: string | null;
}

async function loadInvitePreview(code: string): Promise<InvitePreview | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('invite_preview', { p_code: code });
  return (data as InvitePreview[] | null)?.[0] ?? null;
}

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
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const { locale } = await params;
  // Invite links: /hu/auth/register?code=QX-XXXX-XXXX
  const { code } = await searchParams;
  const initialInviteCode = (Array.isArray(code) ? code[0] : code)?.trim().slice(0, 64) ?? '';

  // Who invited, with their personal message (only answered for a valid code; migration 014)
  const preview = initialInviteCode ? await loadInvitePreview(initialInviteCode) : null;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <Card className="glass-strong border-border/50 shadow-glow">
      <CardHeader className="text-center pb-2">
        <CardTitle className="font-display text-xl text-cream">{t('createAccount')}</CardTitle>
        <CardDescription>{t('register')}</CardDescription>
      </CardHeader>
      <CardContent>
        {preview?.inviter_name && (
          <div className="mb-5 rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 text-center">
            <p className="text-sm text-cream">{t.rich('invitedBy', { name: preview.inviter_name, b: (chunks) => <strong className="text-accent">{chunks}</strong> })}</p>
            {preview.message && <p className="mt-2 text-sm italic leading-relaxed text-muted-foreground">„{preview.message}”</p>}
            {preview.email_hint && <p className="mt-2 text-[11px] text-muted-foreground/80">{t('inviteForEmail', { email: preview.email_hint })}</p>}
          </div>
        )}
        <RegisterForm initialInviteCode={initialInviteCode} />
      </CardContent>
    </Card>
  );
}