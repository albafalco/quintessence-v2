import { cn } from '@/lib/utils';

interface FlagIconProps {
  locale: string;
  className?: string;
  title?: string;
}

export function FlagIcon({ locale, className, title }: FlagIconProps) {
  return (
    <span
      className={cn('inline-flex shrink-0 overflow-hidden rounded-[3px] shadow-sm', className)}
      title={title}
      aria-hidden={title ? undefined : true}
    >
      {locale === 'hu' && (
        <svg viewBox="0 0 60 40" className="h-full w-full" role="img">
          <rect width="60" height="13.33" fill="#CE2939" />
          <rect y="13.33" width="60" height="13.34" fill="#FFFFFF" />
          <rect y="26.67" width="60" height="13.33" fill="#477050" />
        </svg>
      )}
      {locale === 'en' && (
        <svg viewBox="0 0 60 40" className="h-full w-full" role="img">
          <rect width="60" height="40" fill="#012169" />
          <path d="M0 0 L60 40 M60 0 L0 40" stroke="#FFFFFF" strokeWidth="8" />
          <path d="M0 0 L60 40 M60 0 L0 40" stroke="#C8102E" strokeWidth="4" />
          <path d="M30 0 V40 M0 20 H60" stroke="#FFFFFF" strokeWidth="12" />
          <path d="M30 0 V40 M0 20 H60" stroke="#C8102E" strokeWidth="6" />
        </svg>
      )}
      {locale === 'de' && (
        <svg viewBox="0 0 60 40" className="h-full w-full" role="img">
          <rect width="60" height="13.33" fill="#000000" />
          <rect y="13.33" width="60" height="13.34" fill="#DD0000" />
          <rect y="26.67" width="60" height="13.33" fill="#FFCE00" />
        </svg>
      )}
      {locale === 'es' && (
        <svg viewBox="0 0 60 40" className="h-full w-full" role="img">
          <rect width="60" height="10" fill="#AA151B" />
          <rect y="10" width="60" height="20" fill="#F1BF00" />
          <rect y="30" width="60" height="10" fill="#AA151B" />
        </svg>
      )}
      {locale === 'it' && (
        <svg viewBox="0 0 60 40" className="h-full w-full" role="img">
          <rect width="20" height="40" fill="#009246" />
          <rect x="20" width="20" height="40" fill="#FFFFFF" />
          <rect x="40" width="20" height="40" fill="#CE2B37" />
        </svg>
      )}
    </span>
  );
}