'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { BADGES } from '@/lib/badges';

const VISIBLE_MS = 6000;

/** Gold toast announcing newly earned badges. */
export function BadgeToast({ badgeIds }: { badgeIds: string[] }) {
  const t = useTranslations('badges');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible || badgeIds.length === 0 || typeof document === 'undefined') return null;
  const first = BADGES.find((b) => b.id === badgeIds[0]);

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.5rem)] z-[150] flex justify-center px-4">
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-accent/40 bg-card/95 px-4 py-3 text-left shadow-glow-gold backdrop-blur animate-slide-up"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-light to-accent-dark text-lg">
          {first?.icon ?? '✦'}
        </span>
        <span>
          <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            {badgeIds.length === 1 ? t('newBadge') : t('newBadges', { count: badgeIds.length })}
          </span>
          <span className="block text-sm font-semibold text-cream">
            {badgeIds.map((id) => t(`${id}.title`)).join(' · ')}
          </span>
        </span>
      </button>
    </div>,
    document.body
  );
}
