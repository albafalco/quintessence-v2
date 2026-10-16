'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, ChevronRight } from 'lucide-react';
import { relativeTime, stripRichText, type ResolvedNotification } from '@/lib/notifications';
import { RichText } from '@/components/notifications/RichText';
import { cn } from '@/lib/utils';

const ICON_STYLE: Record<ResolvedNotification['category'], string> = {
  news: 'bg-accent/15 text-accent',
  content: 'bg-primary/30 text-accent-light',
  system: 'bg-amber-400/15 text-amber-200',
  personal: 'bg-gradient-to-br from-accent-light to-accent-dark text-accent-foreground',
};

/** Height of the collapsed text (~3 lines of text-sm leading-relaxed). */
const COLLAPSED_PX = 70;
const HIGHLIGHT_MS = 2500;

interface NotificationItemProps {
  item: ResolvedNotification;
  /** compact: bell list (2-line preview); full: notifications page */
  variant: 'compact' | 'full';
  /** Compact: opens the item. Full: the link button was used. */
  onOpen?: () => void;
  /** Full: marks the item read (expanding a long text does it too) */
  onRead?: () => void;
  /** Full: arrived here from the bell or a push — open and briefly highlighted */
  highlight?: boolean;
}

function Icon({ item }: { item: ResolvedNotification }) {
  return (
    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base', ICON_STYLE[item.category])}>
      {item.icon}
    </span>
  );
}

export function NotificationItem(props: NotificationItemProps) {
  return props.variant === 'compact' ? <CompactItem {...props} /> : <FullItem {...props} />;
}

function CompactItem({ item, onOpen }: NotificationItemProps) {
  const t = useTranslations('notifications');
  const locale = useLocale();
  const unread = !item.row.is_read;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/30', unread && 'bg-accent/[0.04]')}
    >
      <Icon item={item} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className={cn('min-w-0 flex-1 text-sm', unread ? 'font-semibold text-cream' : 'text-cream/80')}>{item.title}</p>
          {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent shadow-glow-gold" aria-label={t('unread')} />}
        </div>
        {item.body && <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">{stripRichText(item.body)}</p>}
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          {relativeTime(item.row.created_at, locale)}
          {item.expired && <> · {t('expired')}</>}
        </p>
      </div>
    </button>
  );
}

function FullItem({ item, onOpen, onRead, highlight = false }: NotificationItemProps) {
  const t = useTranslations('notifications');
  const locale = useLocale();
  const unread = !item.row.is_read;
  const bodyRef = useRef<HTMLDivElement>(null);
  const [fullHeight, setFullHeight] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(highlight);
  const [glow, setGlow] = useState(highlight);

  // Long texts start folded; the observer also follows font loading / resizes
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setFullHeight(el.scrollHeight));
    observer.observe(el.firstElementChild ?? el);
    return () => observer.disconnect();
  }, []);

  // Arrived via the bell or a push: the highlight fades, the item counts as read
  useEffect(() => {
    if (!highlight) return;
    const timer = setTimeout(() => {
      setGlow(false);
      if (unread) onRead?.();
    }, HIGHLIGHT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight]);

  const long = fullHeight !== null && fullHeight > COLLAPSED_PX + 8;
  const folded = long && !expanded;

  const expand = () => {
    setExpanded(true);
    if (unread) onRead?.();
  };

  return (
    <article
      id={`n-${item.row.id}`}
      className={cn(
        'premium-card scroll-mt-28 p-4 transition-[border-color,box-shadow] duration-700',
        unread && 'border-accent/30',
        glow && 'border-accent/70 shadow-glow-gold'
      )}
    >
      <div className="flex items-start gap-3">
        <Icon item={item} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className={cn('min-w-0 flex-1', unread ? 'font-semibold text-cream' : 'text-cream/85')}>{item.title}</p>
            {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent shadow-glow-gold" aria-label={t('unread')} />}
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            {relativeTime(item.row.created_at, locale)}
            {item.expired && <> · {t('expired')}</>}
          </p>
        </div>
      </div>

      {item.body && (
        <div className="relative mt-3">
          <div
            ref={bodyRef}
            className="overflow-hidden transition-[max-height] duration-300 ease-out motion-reduce:transition-none"
            style={{ maxHeight: folded ? COLLAPSED_PX : fullHeight ?? undefined }}
          >
            <RichText text={item.body} locale={locale} className="text-sm leading-relaxed text-muted-foreground" />
          </div>
          {folded && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card-elevated to-transparent" />}
        </div>
      )}

      {(long || item.href || unread) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {long && (
            <button
              type="button"
              onClick={() => (expanded ? setExpanded(false) : expand())}
              aria-expanded={expanded}
              className="text-xs font-medium text-accent transition hover:brightness-110"
            >
              {expanded ? `${t('showLess')} ▴` : `${t('readMore')} ▾`}
            </button>
          )}
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
          {unread && onRead && (
            <button
              type="button"
              onClick={onRead}
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground transition hover:text-accent"
            >
              <Check className="h-3 w-3" />
              {t('markRead')}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
