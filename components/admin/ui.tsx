'use client';

import { cn } from '@/lib/utils';

export function PrimaryButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'shrink-0 rounded-xl bg-gradient-to-r from-accent-dark via-accent to-accent-light px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-40',
        className
      )}
    />
  );
}

export function SecondaryButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'shrink-0 rounded-xl border border-accent/30 px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent/10 disabled:opacity-40',
        className
      )}
    />
  );
}

/** 6-digit one-time code field (authenticator app). */
export function CodeInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      placeholder="000000"
      aria-label="6 jegyű kód"
      className="h-11 w-36 rounded-xl border border-border/60 bg-background/60 text-center font-mono text-xl tracking-[0.35em] text-cream placeholder:text-muted-foreground/40 focus:border-accent/60 focus:outline-none"
    />
  );
}
