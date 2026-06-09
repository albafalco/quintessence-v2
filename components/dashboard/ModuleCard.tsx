'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ModuleCardProps {
  title: string;
  subtitle: string;
  href: string;
  progressType: 'ring' | 'bar';
  progress: number;
  progressLabel?: string;
  lastActivity: string | null;
  icon: string;
  variant?: 'magia' | 'angol';
}

function ProgressRing({ progress, size = 72, variant = 'magia' }: { progress: number; size?: number; variant?: 'magia' | 'angol' }) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const color = variant === 'magia' ? '#D4AF37' : '#94a3b8';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/60"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{ filter: variant === 'magia' ? 'drop-shadow(0 0 6px rgba(212,175,55,0.4))' : undefined }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-cream">
        {Math.round(progress)}%
      </span>
    </div>
  );
}

export function ModuleCard({
  title,
  subtitle,
  href,
  progressType,
  progress,
  progressLabel,
  lastActivity,
  icon,
  variant = 'magia',
}: ModuleCardProps) {
  const t = useTranslations('dashboard');
  const isMagia = variant === 'magia';

  return (
    <Card
      className={cn(
        'group premium-card-hover overflow-hidden',
        isMagia ? 'magia-surface' : 'angol-surface'
      )}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-px opacity-60',
          isMagia ? 'bg-gradient-to-r from-transparent via-accent to-transparent' : 'bg-gradient-to-r from-transparent via-slate-400/50 to-transparent'
        )}
      />

      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
              <span
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl text-2xl',
                  isMagia ? 'bg-primary/20 shadow-glow-gold' : 'bg-slate-700/30'
                )}
                aria-hidden
              >
                {icon}
              </span>
              <span className={cn('break-words', isMagia ? 'text-gradient-gold' : 'text-cream')}>{title}</span>
            </CardTitle>
            <CardDescription className="max-w-[220px]">{subtitle}</CardDescription>
            {progressLabel && (
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-accent/80">
                {isMagia && <Sparkles className="h-3 w-3" />}
                {progressLabel}
              </p>
            )}
          </div>
          {progressType === 'ring' && <ProgressRing progress={progress} variant={variant} />}
        </div>
      </CardHeader>

      <CardContent className="relative flex-1 space-y-5">
        {progressType === 'bar' && (
          <div className="space-y-2.5">
            <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>{t('progress')}</span>
              <span className="text-cream">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} variant="angol" className="h-2" />
          </div>
        )}

        <div className="rounded-xl border border-border/40 bg-background/30 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('lastActivity')}</p>
          <p className="mt-1 text-sm font-medium text-cream">
            {lastActivity ?? t('noActivity')}
          </p>
        </div>
      </CardContent>

      <CardFooter className="relative">
        <Button asChild variant={isMagia ? 'gold' : 'secondary'} className="w-full group-hover:shadow-glow-gold">
          <Link href={href}>
            {t('continue')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}