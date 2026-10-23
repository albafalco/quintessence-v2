'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { ElementsNavIcon } from '@/components/ui/ElementsIcon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ModuleCardProps {
  title: string;
  subtitle: string;
  href: string;
  progress: number;
  progressLabel?: string;
  lastActivity: string | null;
  icon: React.ReactNode;
}

export function ModuleCard({
  title,
  subtitle,
  href,
  progress,
  progressLabel,
  lastActivity,
  icon,
}: ModuleCardProps) {
  const t = useTranslations('dashboard');

  return (
    <Card className="group premium-card-hover magia-surface overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />

      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20 text-2xl" aria-hidden>
                {icon}
              </span>
              <span className="break-words text-gradient-gold">{title}</span>
            </CardTitle>
            <CardDescription className="max-w-[220px]">{subtitle}</CardDescription>
            {progressLabel && (
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-accent/80">
                <ElementsNavIcon className="h-3 w-3" />
                {progressLabel}
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
            <Progress value={progress} variant="gold" className="h-2" />
          </div>

        <div className="rounded-xl border border-border/40 bg-background/30 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('lastActivity')}</p>
          <p className="mt-1 text-sm font-medium text-cream">
            {lastActivity ?? t('noActivity')}
          </p>
        </div>
      </CardContent>

      <CardFooter className="relative">
        <Button asChild variant="gold" className="w-full">
          <Link href={href}>
            {t('continue')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}