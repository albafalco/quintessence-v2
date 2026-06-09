import { cn } from '@/lib/utils';

interface ShieldLogoProps {
  size?: number;
  className?: string;
  showGlow?: boolean;
}

export function ShieldLogo({ size = 40, className, showGlow = false }: ShieldLogoProps) {
  return (
    <div
      className={cn('relative inline-flex shrink-0', showGlow && 'drop-shadow-glow-gold', className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 48 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="shieldGrad" x1="24" y1="0" x2="24" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4C1D95" />
            <stop offset="0.5" stopColor="#3B2A6E" />
            <stop offset="1" stopColor="#2a1f4e" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="24" y1="12" x2="24" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e8c96a" />
            <stop offset="0.5" stopColor="#D4AF37" />
            <stop offset="1" stopColor="#b8942d" />
          </linearGradient>
        </defs>
        <path
          d="M24 2L42 10V26C42 38.15 34.5 48.5 24 54C13.5 48.5 6 38.15 6 26V10L24 2Z"
          fill="url(#shieldGrad)"
          stroke="url(#goldGrad)"
          strokeWidth="1.5"
        />
        <path
          d="M24 14C24 14 18 18 18 24C18 28 20.5 30.5 24 34C27.5 30.5 30 28 30 24C30 18 24 14 24 14Z"
          fill="url(#goldGrad)"
          opacity="0.95"
        />
        <path
          d="M24 16V32M20 20H28M20 24H28"
          stroke="#3B2A6E"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx="24" cy="38" r="2" fill="#D4AF37" opacity="0.8" />
      </svg>
    </div>
  );
}