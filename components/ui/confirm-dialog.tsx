'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface ConfirmOptions {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Red confirm button for irreversible actions (e.g. delete). */
  destructive?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

/**
 * In-app replacement for window.confirm(), styled like the rest of the app
 * (the native dialog uses the platform's blue buttons on iOS).
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   if (!(await confirm({ message, confirmLabel, cancelLabel }))) return;
 *   ...
 *   return <>{...}{confirmDialog}</>;
 */
export function useConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    []
  );

  const close = useCallback(
    (confirmed: boolean) => {
      pending?.resolve(confirmed);
      setPending(null);
    },
    [pending]
  );

  const confirmDialog: ReactNode = pending ? (
    <ConfirmDialog
      message={pending.message}
      confirmLabel={pending.confirmLabel}
      cancelLabel={pending.cancelLabel}
      destructive={pending.destructive}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null;

  return { confirm, confirmDialog };
}

interface ConfirmDialogProps extends ConfirmOptions {
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ message, confirmLabel, cancelLabel, destructive, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Safe default: focus the cancel button.
    cancelRef.current?.focus();

    // Capture phase + stopPropagation: the dialog underneath (MagiaModal)
    // must not also react to Escape / Tab while this one is open.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        const next = document.activeElement === cancelRef.current ? confirmRef.current : cancelRef.current;
        next?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-accent/25 bg-card p-6 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-describedby="confirm-dialog-message"
      >
        <p id="confirm-dialog-message" className="text-center text-[15px] leading-relaxed text-cream">
          {message}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border/60 bg-muted/30 py-3 text-sm font-semibold text-cream transition hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={cn(
              'flex-1 rounded-xl py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
              destructive
                ? 'border border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25'
                : 'bg-gradient-to-r from-accent-dark via-accent to-accent-light text-accent-foreground shadow-glow-gold hover:brightness-110'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
