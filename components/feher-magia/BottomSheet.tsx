'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

/** Length of the closing slide (animate-sheet-out) */
const CLOSE_MS = 220;
/** Pulled down this far, the sheet closes */
const DRAG_CLOSE_PX = 90;

/**
 * The "+" note over the dimmed page: on a phone a card sliding up from the bottom
 * (pulled down by its handle, it closes), on a desktop a centred dialog.
 * Closes with ✕, Esc or a tap on the backdrop.
 */
export function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const t = useTranslations('feherMagia.flow');
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<number | null>(null);

  const close = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [close]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Pulling down is a touch gesture (the handle is hidden on a desktop)
    if (e.pointerType === 'mouse') return;
    dragStart.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current !== null) setDrag(Math.max(0, e.clientY - dragStart.current));
  };
  const onPointerUp = () => {
    dragStart.current = null;
    if (drag > DRAG_CLOSE_PX) close();
    else setDrag(0);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col justify-end md:items-center md:justify-center md:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={close}
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-[2px] motion-reduce:animate-none',
          closing ? 'animate-out fade-out-0 fill-mode-forwards duration-200' : 'animate-in fade-in-0 duration-300'
        )}
      />
      <div
        className={cn(
          'premium-card magia-surface relative mx-auto flex max-h-[88dvh] w-full max-w-lg flex-col rounded-b-none rounded-t-3xl motion-reduce:animate-none md:max-h-[85dvh] md:max-w-[480px] md:rounded-3xl',
          closing ? 'pointer-events-none animate-sheet-out md:animate-pop-out' : 'animate-sheet-in md:animate-pop-in',
          drag === 0 && 'transition-transform duration-200'
        )}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined, paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        {/* The handle and the title: pulled down, the sheet closes */}
        <div
          className="touch-none px-5 pt-2.5 md:pt-4"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="mx-auto block h-1.5 w-10 rounded-full bg-muted-foreground/30 md:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-3 pb-1 pt-3">
            <h2 className="font-display text-xl font-semibold leading-snug text-gradient-gold">{title}</h2>
            <button
              type="button"
              onClick={close}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={t('close')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/30 text-muted-foreground transition hover:border-accent/30 hover:text-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-1 pt-2">{children}</div>
      </div>
    </div>,
    document.body
  );
}
