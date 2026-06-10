'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface ShieldLogoProps {
  size?: number;
  className?: string;
  showGlow?: boolean;
}

export function ShieldLogo({ size = 40, className, showGlow = false }: ShieldLogoProps) {
  const t = useTranslations('brand');

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center',
        showGlow && 'drop-shadow-glow-gold',
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/favicon.png"
        alt={t('name')}
        width={size}
        height={size}
        className="h-full w-full object-contain"
        sizes={`${size}px`}
        priority={size >= 64}
      />
    </div>
  );
}