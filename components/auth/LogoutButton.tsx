'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LogoutButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'icon' | 'nav';
  className?: string;
  showLabel?: boolean;
}

export function LogoutButton({ variant = 'outline', className, showLabel = true }: LogoutButtonProps) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/auth/login`);
    router.refresh();
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        title={t('logout')}
        aria-label={t('logout')}
        className={cn(
          'flex items-center gap-2 rounded-xl border border-border/50 text-muted-foreground transition-all hover:border-red-500/30 hover:bg-red-900/20 hover:text-red-300',
          showLabel ? 'h-9 px-3' : 'h-9 w-9 justify-center',
          className
        )}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {showLabel && (
          <span className="hidden text-sm font-medium sm:inline">
            {loading ? t('loading') : t('logout')}
          </span>
        )}
      </button>
    );
  }

  if (variant === 'nav') {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        title={t('logout')}
        aria-label={t('logout')}
        className={cn(
          'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
          'text-muted-foreground hover:bg-red-900/20 hover:text-red-300',
          !showLabel && 'justify-center px-2',
          className
        )}
      >
        <LogOut className="h-5 w-5 shrink-0 transition-colors group-hover:text-red-300" />
        {showLabel && <span>{loading ? t('loading') : t('logout')}</span>}
      </button>
    );
  }

  return (
    <Button
      variant={variant === 'ghost' ? 'ghost' : variant}
      onClick={handleLogout}
      disabled={loading}
      className={cn(
        variant === 'outline' && 'border-red-500/20 text-red-300 hover:bg-red-900/20 hover:text-red-200',
        className
      )}
    >
      <LogOut className="h-4 w-4" />
      {loading ? t('loading') : t('logout')}
    </Button>
  );
}