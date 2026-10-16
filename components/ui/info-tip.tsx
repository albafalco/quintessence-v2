'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Gap kept between the tooltip and the edge of its boundary (px). */
const TOOLTIP_EDGE_GAP = 8;

interface InfoTipProps {
  /** Content of the trigger button (icon) */
  children: React.ReactNode;
  /** Accessible name of the trigger */
  label: string;
  title: string;
  description: string;
  /** Optional highlighted last line (e.g. "Earned: …") */
  footer?: string;
  /** The tooltip is shifted sideways to stay inside this element */
  boundaryRef: React.RefObject<HTMLElement | null>;
  className?: string;
  /** Extra trigger classes while the tooltip is open */
  openClassName?: string;
}

/**
 * Small popover bubble: opens on mouse hover, keyboard focus or tap.
 * Shows above the trigger, or below it when it would slide under an element
 * marked with `data-tip-avoid` (e.g. a sticky tab bar) or off the screen.
 */
export function InfoTip({ children, label, title, description, footer, boundaryRef, className, openClassName }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const lastPointer = useRef<string>('mouse');
  const tipId = useId();

  // Centre the tooltip over the trigger, nudge it back inside the boundary,
  // and flip it below the trigger when there is no room above
  useLayoutEffect(() => {
    const tip = tipRef.current;
    const arrow = arrowRef.current;
    if (!open || !tip || !arrow) return;
    tip.style.marginLeft = '0px';
    arrow.style.marginLeft = '0px';
    tip.dataset.side = 'top';
    const rect = tip.getBoundingClientRect();
    const boundary = boundaryRef.current;
    if (boundary) {
      const bounds = boundary.getBoundingClientRect();
      let shift = 0;
      if (rect.left < bounds.left + TOOLTIP_EDGE_GAP) shift = bounds.left + TOOLTIP_EDGE_GAP - rect.left;
      else if (rect.right > bounds.right - TOOLTIP_EDGE_GAP) shift = bounds.right - TOOLTIP_EDGE_GAP - rect.right;
      tip.style.marginLeft = `${shift}px`;
      arrow.style.marginLeft = `${-shift}px`;
    }
    const topLimit = Math.max(0, ...Array.from(document.querySelectorAll('[data-tip-avoid]'), (el) => el.getBoundingClientRect().bottom));
    if (rect.top < topLimit + TOOLTIP_EDGE_GAP) tip.dataset.side = 'bottom';
  }, [open, boundaryRef]);

  // Touch: a tap anywhere else closes it; Esc closes it everywhere
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? tipId : undefined}
        onPointerDown={(e) => {
          lastPointer.current = e.pointerType;
        }}
        onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && setOpen(true)}
        onBlur={() => setOpen(false)}
        // With a mouse, hover already opened it — a click must not close it again
        onClick={() => setOpen((v) => (lastPointer.current === 'mouse' ? true : !v))}
        className={cn(className, open && openClassName)}
      >
        {children}
      </button>
      {open && (
        <span
          ref={tipRef}
          id={tipId}
          role="tooltip"
          data-side="top"
          className="group absolute bottom-full left-[calc(50%-6.5rem)] z-30 mb-2.5 block w-52 animate-pop-in rounded-xl border border-accent/30 bg-card-elevated/95 px-3 py-2.5 text-left shadow-card backdrop-blur motion-reduce:animate-none data-[side=bottom]:bottom-auto data-[side=bottom]:top-full data-[side=bottom]:mb-0 data-[side=bottom]:mt-2.5"
        >
          <span className="block text-sm font-semibold text-cream">{title}</span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{description}</span>
          {footer && <span className="mt-1.5 block text-[11px] font-medium text-accent">✦ {footer}</span>}
          <span
            ref={arrowRef}
            aria-hidden
            className="absolute left-[calc(50%-5px)] top-full block h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-r border-accent/30 bg-card-elevated group-data-[side=bottom]:bottom-full group-data-[side=bottom]:top-auto group-data-[side=bottom]:translate-y-1/2 group-data-[side=bottom]:border-b-0 group-data-[side=bottom]:border-l group-data-[side=bottom]:border-r-0 group-data-[side=bottom]:border-t"
          />
        </span>
      )}
    </span>
  );
}
