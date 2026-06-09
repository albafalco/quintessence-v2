'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ModuleCardProps {
  title: string;
  subtitle: string;
  href: string;
  progressType: 'ring' | 'bar';
  progress: number;
  progressLabel?: string;
  lastActivity: string | null;
  icon: string;
}

function ProgressRing({ progress, size = 64 }: { progress: number; size?: number }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

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
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
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
}: ModuleCardProps) {
  const t = useTranslations('dashboard');

  return (
    <Card className="flex h-full flex-col transition-colors hover:border-primary/40">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>
                {icon}
              </span>
              {title}
            </CardTitle>
            <CardDescription className="mt-1">{subtitle}</CardDescription>
            {progressLabel && (
              <p className="mt-2 text-sm text-muted-foreground">{progressLabel}</p>
            )}
          </div>
          {progressType === 'ring' && <ProgressRing progress={progress} />}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {progressType === 'bar' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t('progress')}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2.5" />
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          {t('lastActivity')}:{' '}
          <span className="text-foreground">
            {lastActivity ?? t('noActivity')}
          </span>
        </p>
      </CardContent>

      <CardFooter>
        <Button asChild className="w-full">
          <Link href={href}>
            {t('continue')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}