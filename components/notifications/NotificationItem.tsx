'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';
import { relativeTime, type ResolvedNotification } from '@/lib/notifications';
import { RichText, stripRichText } from '@/components/notifications/RichText';
import { cn } from '@/lib/utils';

const ICON_STYLE: Record<ResolvedNotification['category'], string> = {
  news: 'bg-accent/15 text-accent',
  content: 'bg-primary/30 text-accent-light',
  system: 'bg-amber-400/15 text-amber-200',
  personal: 'bg-gradient-to-br from-accent-light to-accent-dark text-accent-foreground',
};

interface NotificationItemProps {
  item: ResolvedNotification;
  /** compact: bell list (2-line preview); full: notifications page */
  variant: 'compact' | 'full';
  onOpen?: () => void;
  onToggleRead?: () => void;
}

export function NotificationItem({ item, variant, onOpen, onToggleRead }: NotificationItemProps) {
  const t = useTranslations('notifications');
  const locale = useLocale();
  const unread = !item.row.is_read;

  const head = (
    <>
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base', ICON_STYLE[item.category])}>{item.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className={cn('min-w-0 flex-1 text-sm', unread ? 'font-semibold text-cream' : 'text-cream/80')}>{item.title}</p>
          {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent shadow-glow-gold" aria-label={t('unread')} />}
        </div>
        {variant === 'compact' ? (
          item.body && <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">{stripRichText(item.body)}</p>
        ) : (
          item.body && <RichText text={item.body} locale={locale} className="mt-1 text-sm leading-relaxed text-muted-foreground" />
        )}
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          {relativeTime(item.row.created_at, locale)}
          {item.expired && <> · {t('expired')}</>}
        </p>
      </div>
    </>
  );

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={cn('flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/30', unread && 'bg-accent/[0.04]')}
      >
        {head}
      </button>
    );
  }

  return (
    <article id={`n-${item.row.id}`} className={cn('premium-card flex items-start gap-3 p-4', unread && 'border-accent/30')}>
      {head}
      <div className="flex shrink-0 flex-col items-end gap-2">
        {item.href && (
          <a
            href={item.href}
            onClick={onOpen}
            className="inline-flex items-center gap-1 rounded-lg border border-accent/30 px-2.5 py-1 text-xs font-medium text-accent transition hover:bg-accent/10"
            {...(/^https?:/i.test(item.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {item.linkLabel || t('open')}
            <ChevronRight className="h-3.5 w-3.5" />
          </a>
        )}
        {onToggleRead && (
          <button type="button" onClick={onToggleRead} className="text-[11px] text-muted-foreground transition hover:text-accent">
            {unread ? t('markRead') : t('markUnread')}
          </button>
        )}
      </div>
    </article>
  );
}
