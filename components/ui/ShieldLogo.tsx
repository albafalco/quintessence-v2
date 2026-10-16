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
        className
      )}
      style={{ width: size, height: size }}
    >
      {showGlow && (
        // Glow as a radial gradient, not a CSS filter: on iOS Safari a filtered
        // element inside a backdrop-filter (glass) header punches a square hole
        // into the blurred background.
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-[30%] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(212, 175, 55, 0.28) 0%, rgba(212, 175, 55, 0.08) 45%, transparent 70%)',
          }}
        />
      )}
      <Image
        src="/icon-192.png"
        alt={t('name')}
        width={size}
        height={size}
        className="relative h-full w-full object-contain"
        sizes={`${size}px`}
        priority={size >= 64}
      />
    </div>
  );
}