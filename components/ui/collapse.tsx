'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CollapseProps {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * Animated show/hide: the height rolls out via a grid-template-rows transition
 * (0fr → 1fr) while the content fades in. Collapsed content stays mounted but
 * is inert, so it can't be focused or read by screen readers.
 */
export function Collapse({ open, children, className, id }: CollapseProps) {
  // Clipping is only needed while moving; once fully open, popovers inside
  // (e.g. badge tooltips) may overflow the box
  const [settled, setSettled] = useState(open);

  return (
    <div
      id={id}
      inert={!open}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && e.propertyName === 'grid-template-rows') setSettled(open);
      }}
      className={cn(
        // Reduced motion: near-instant instead of none, so transitionend still fires
        'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:duration-[1ms]',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      )}
    >
      <div className={cn('min-h-0', open && settled ? 'overflow-visible' : 'overflow-hidden', className)}>{children}</div>
    </div>
  );
}
