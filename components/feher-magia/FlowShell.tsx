'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
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
 * The practices' surface: one thing at a time, safe-area aware; the whole screen on a
 * phone, a dialog over the dimmed page on a desktop.
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
    // A phone: the whole screen. A desktop: a dialog over the dimmed page.
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] md:flex md:items-center md:justify-center md:p-6">
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 hidden bg-black/60 backdrop-blur-[2px] motion-reduce:animate-none md:block',
          closing ? 'animate-out fade-out-0 fill-mode-forwards duration-200' : 'animate-in fade-in-0 duration-300'
        )}
      />
      <div
        className={cn(
          'relative flex h-full flex-col overflow-y-auto motion-reduce:animate-none',
          'pb-[max(16px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] pt-[max(12px,env(safe-area-inset-top))]',
          'md:h-auto md:max-h-[90dvh] md:min-h-[min(560px,90dvh)] md:w-full md:max-w-[640px] md:rounded-3xl md:border md:border-border/60 md:p-8 md:shadow-card',
          closing ? 'pointer-events-none animate-sheet-out md:animate-pop-out' : 'animate-sheet-in md:animate-pop-in',
          // The app's own background; a darker one for the closed-eye practices (following the theme)
          dim ? 'flow-dim' : 'bg-background bg-[image:var(--gradient-cosmic)]'
        )}
      >
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          <header className="flex min-h-12 items-center justify-between gap-3 pb-1">
            <span className={cn('truncate font-display text-xl font-semibold', dim ? 'text-cream/70' : 'text-gradient-gold')}>{title}</span>
            <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
              {meta && <span className="tabular-nums">{meta}</span>}
              {close && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-muted/30 text-muted-foreground transition hover:border-accent/30 hover:text-accent"
                  aria-label={t('close')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </span>
          </header>
          <div className="flex flex-1 flex-col gap-5 pt-2">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
