import type { PushHealth } from '@/lib/admin-push';
import { cn } from '@/lib/utils';

const META: Record<PushHealth, { label: string; dot: string; text: string }> = {
  ok: { label: 'Működik', dot: 'bg-green-400', text: 'text-green-300' },
  late: { label: 'Késik', dot: 'bg-amber-400', text: 'text-amber-200' },
  error: { label: 'Hiba / nincs futás', dot: 'bg-red-400', text: 'text-red-300' },
};

export function PushHealthBadge({ health, className }: { health: PushHealth; className?: string }) {
  const meta = META[health];
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm font-medium', meta.text, className)}>
      <span className={cn('h-2.5 w-2.5 rounded-full', meta.dot, health === 'ok' && 'animate-pulse')} />
      {meta.label}
    </span>
  );
}
