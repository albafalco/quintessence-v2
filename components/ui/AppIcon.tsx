import {
  Award,
  BookOpen,
  Brain,
  ChartColumn,
  CircleCheck,
  CircleX,
  Crown,
  Droplet,
  Eye,
  Flame,
  Gem,
  GraduationCap,
  Headphones,
  Heart,
  Hourglass,
  KeyRound,
  Leaf,
  Library,
  Lock,
  Mail,
  Mic,
  Moon,
  Mountain,
  Orbit,
  PartyPopper,
  Pause,
  Pencil,
  PenLine,
  Play,
  Repeat,
  Sparkles,
  Sprout,
  Star,
  Target,
  Ticket,
  Timer,
  TriangleAlert,
  Turtle,
  Volume2,
  Waves,
  Wind,
  Zap,
  createLucideIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** Hand mirror in the lucide line style (lucide has no mirror icon). */
export const MirrorIcon = createLucideIcon('Mirror', [
  ['ellipse', { cx: '12', cy: '9', rx: '6.5', ry: '7', key: 'glass' }],
  ['path', { d: 'M12 16v6', key: 'handle' }],
  ['path', { d: 'M8.5 9a3.5 3.5 0 0 1 3.5-3.5', key: 'shine' }],
  ['path', { d: 'M9.5 12.5l5-5', key: 'glint' }],
]);

/**
 * Line icons used instead of colour emojis, so the app matches the sidebar.
 * `lib/` files refer to them by name (badges, notifications, fokozatok).
 */
export const APP_ICONS = {
  sparkles: Sparkles,
  book: BookOpen,
  alert: TriangleAlert,
  award: Award,
  star: Star,
  ticket: Ticket,
  party: PartyPopper,
  chart: ChartColumn,
  flame: Flame,
  repeat: Repeat,
  crown: Crown,
  mirror: MirrorIcon,
  library: Library,
  graduation: GraduationCap,
  key: KeyRound,
  sprout: Sprout,
  leaf: Leaf,
  waves: Waves,
  orbit: Orbit,
  eye: Eye,
  moon: Moon,
  brain: Brain,
  gem: Gem,
  zap: Zap,
  wind: Wind,
  droplet: Droplet,
  mountain: Mountain,
  heart: Heart,
  hourglass: Hourglass,
  volume: Volume2,
  mic: Mic,
  headphones: Headphones,
  turtle: Turtle,
  check: CircleCheck,
  cross: CircleX,
  pen: PenLine,
  pencil: Pencil,
  lock: Lock,
  timer: Timer,
  play: Play,
  pause: Pause,
  target: Target,
  mail: Mail,
} satisfies Record<string, LucideIcon>;

export type AppIconName = keyof typeof APP_ICONS;

/** Unknown names fall back to ✦ (Sparkles). Gold by default; pass a text-* class to override. */
export function AppIcon({
  name,
  className,
  filled,
  style,
}: {
  name: string;
  className?: string;
  filled?: boolean;
  style?: React.CSSProperties;
}) {
  const Icon = APP_ICONS[name as AppIconName] ?? Sparkles;
  return (
    <Icon
      aria-hidden
      className={cn('inline-block h-4 w-4 shrink-0 text-accent', className)}
      fill={filled ? 'currentColor' : 'none'}
      style={style}
    />
  );
}
