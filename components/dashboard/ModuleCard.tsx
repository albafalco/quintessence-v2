'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { ElementsNavIcon } from '@/components/ui/ElementsIcon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AppIcon } from '@/components/ui/AppIcon';

interface ModuleCardProps {
  title: string;
  subtitle: string;
  href: string;
  progress: number;
  progressLabel?: string;
  /** Extra highlighted line under the label, e.g. today's review count */
  note?: string;
  lastActivity: string | null;
  /** Emoji or element (flag emojis don't render on Windows — use FlagIcon). */
  icon: React.ReactNode;
  variant?: 'magia' | 'angol';
}

export function ModuleCard({
  title,
  subtitle,
  href,
  progress,
  progressLabel,
  note,
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
                {isMagia && <ElementsNavIcon className="h-3 w-3" />}
                {progressLabel}
              </p>
            )}
            {note && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
                <AppIcon name="repeat" className="h-3.5 w-3.5" />
                {note}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative flex-1 space-y-5">
        <div className="space-y-2.5">
            <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>{t('progress')}</span>
              <span className="text-cream">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} variant={isMagia ? 'gold' : 'angol'} className="h-2" />
          </div>

        <div className="rounded-xl border border-border/40 bg-background/30 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('lastActivity')}</p>
          <p className="mt-1 text-sm font-medium text-cream">
            {lastActivity ?? t('noActivity')}
          </p>
        </div>
      </CardContent>

      <CardFooter className="relative">
        <Button asChild variant="gold" className="w-full group-hover:shadow-glow-gold">
          <Link href={href}>
            {t('continue')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}