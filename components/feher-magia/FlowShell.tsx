'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface FlowShellProps {
  title?: string;
  /** e.g. "2 / 4" */
  meta?: string;
  onClose?: () => void;
  /** A darker, distraction-free surface (closed-eye practices) */
  dim?: boolean;
  children: ReactNode;
}

/** Length of the closing slide (animate-sheet-out) */
const CLOSE_MS = 220;

/**
 * Full-screen surface for the practices: one thing at a time, safe-area aware.
 * Slides up when opened and down when closed with ✕ or Esc (no motion with reduced motion).
 * Opened only by a tap, so it always renders in the browser (never on the server).
 */
export function FlowShell({ title, meta, onClose: close, dim, children }: FlowShellProps) {
  const t = useTranslations('feherMagia.flow');
  const [closing, setClosing] = useState(false);

  const onClose = useCallback(() => {
    if (!close) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      close();
      return;
    }
    setClosing(true);
    window.setTimeout(close, CLOSE_MS);
  }, [close]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!close) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close, onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={cn(
        'fixed inset-0 z-[100] flex flex-col overflow-y-auto motion-reduce:animate-none',
        closing ? 'pointer-events-none animate-sheet-out' : 'animate-sheet-in',
        dim ? 'bg-[#05040a] text-cream' : 'bg-background'
      )}
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))',
      }}
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <header className="flex min-h-11 items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="truncate font-semibold uppercase tracking-[0.18em] text-accent/70">{title}</span>
          <span className="flex items-center gap-3">
            {meta && <span className="tabular-nums">{meta}</span>}
            {close && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-2 py-1.5 text-muted-foreground transition hover:text-cream"
                aria-label={t('close')}
              >
                ✕
              </button>
            )}
          </span>
        </header>
        <div className="flex flex-1 flex-col gap-5 pt-2">{children}</div>
      </div>
    </div>,
    document.body
  );
}
