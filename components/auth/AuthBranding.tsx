'use client';

import { useTranslations } from 'next-intl';
import { ShieldLogo } from '@/components/ui/ShieldLogo';

export function AuthBranding() {
  const t = useTranslations('brand');

  return (
    <div className="relative mb-8 flex flex-col items-center gap-3">
      <ShieldLogo size={64} showGlow />
      <h1 className="font-display text-2xl font-semibold text-gradient-gold">{t('name')}</h1>
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t('tagline')}</p>
    </div>
  );
}