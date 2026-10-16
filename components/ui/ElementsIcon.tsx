import { createLucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ElementsIconProps {
  className?: string;
  title?: string;
}

const CENTER = 32;
const RADIUS = 23;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP_DEG = 12;
const SEGMENT = (CIRCUMFERENCE * (90 - GAP_DEG)) / 360;

// The four classical elements around the circle; the gold star in the centre
// is the fifth element — the quintessence the app is named after.
// Gradient ids are fixed: every instance defines identical gradients, so
// duplicates on one page render the same.
const ELEMENTS = [
  { id: 'qs-el-fire', light: '#F07A5F', dark: '#C23B2C', startDeg: -135 }, // tűz — top
  { id: 'qs-el-air', light: '#79AEF0', dark: '#2F6FC2', startDeg: -45 }, // levegő — right
  { id: 'qs-el-water', light: '#5CC593', dark: '#23845A', startDeg: 45 }, // víz — bottom
  { id: 'qs-el-earth', light: '#F2CC5B', dark: '#C99524', startDeg: 135 }, // föld — left
] as const;

/** Four-pointed star (✦) centred on the icon. */
function starPath(outer: number, inner: number) {
  const points: string[] = [];
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 4) * i - Math.PI / 2;
    points.push(`${(CENTER + r * Math.cos(a)).toFixed(2)},${(CENTER + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${points.join('L')}Z`;
}

export function ElementsIcon({ className, title }: ElementsIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      style={{ filter: 'drop-shadow(0 0 5px rgba(212, 175, 55, 0.3))' }}
    >
      {title && <title>{title}</title>}
      <defs>
        {ELEMENTS.map(({ id, light, dark }) => (
          <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={light} />
            <stop offset="100%" stopColor={dark} />
          </linearGradient>
        ))}
        <radialGradient id="qs-el-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Element arcs */}
      {ELEMENTS.map(({ id, startDeg }) => (
        <circle
          key={id}
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={6.5}
          strokeDasharray={`${SEGMENT} ${CIRCUMFERENCE - SEGMENT}`}
          transform={`rotate(${startDeg + GAP_DEG / 2} ${CENTER} ${CENTER})`}
        />
      ))}

      {/* Gold markers between the elements */}
      {[-135, -45, 45, 135].map((deg) => (
        <circle
          key={deg}
          cx={CENTER + RADIUS * Math.cos((deg * Math.PI) / 180)}
          cy={CENTER + RADIUS * Math.sin((deg * Math.PI) / 180)}
          r={1.5}
          fill="#E8C96A"
        />
      ))}

      {/* Quintessence: glowing gold star */}
      <circle cx={CENTER} cy={CENTER} r={15} fill="url(#qs-el-core)" />
      <path d={starPath(10.5, 3)} fill="#E8C96A" />
      <path d={starPath(6, 1.8)} fill="#FFF3C4" fillOpacity={0.85} />
    </svg>
  );
}

/**
 * Monochrome menu version in the lucide line-icon style (same stroke width,
 * sizing and currentColor as the other navigation icons).
 */
export const ElementsNavIcon = createLucideIcon('ElementsNav', [
  ['path', { d: 'M6.55 4.22A9.5 9.5 0 0 1 17.45 4.22', key: 'fire' }],
  ['path', { d: 'M19.78 6.55A9.5 9.5 0 0 1 19.78 17.45', key: 'air' }],
  ['path', { d: 'M17.45 19.78A9.5 9.5 0 0 1 6.55 19.78', key: 'water' }],
  ['path', { d: 'M4.22 17.45A9.5 9.5 0 0 1 4.22 6.55', key: 'earth' }],
  ['path', { d: 'M12 7.2 13.06 10.94 16.8 12 13.06 13.06 12 16.8 10.94 13.06 7.2 12 10.94 10.94Z', key: 'star' }],
]);
