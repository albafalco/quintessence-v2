import { cn } from '@/lib/utils';

/**
 * Round initial badge of the user. Uses the username (as in the navbar
 * greeting), falling back to the display name.
 */
export function UserAvatar({ username, name, className }: { username: string; name?: string; className?: string }) {
  const initial = (username || name || '').trim().charAt(0).toUpperCase();
  return (
    <div
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cosmic font-bold text-accent',
        className
      )}
    >
      {initial}
    </div>
  );
}
