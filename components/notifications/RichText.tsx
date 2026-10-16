import { Fragment } from 'react';
import { localizeHref } from '@/lib/notifications';

export { stripRichText } from '@/lib/notifications';

/**
 * Minimal, safe formatting for announcement texts: **bold**, [label](url) and
 * line breaks. Everything else is plain text (no HTML is ever interpreted).
 */
const TOKEN = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

function renderInline(line: string, locale: string, keyPrefix: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const match of line.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) out.push(line.slice(last, index));
    if (match[1] !== undefined) {
      out.push(
        <strong key={`${keyPrefix}-${index}`} className="font-semibold text-cream">
          {match[1]}
        </strong>
      );
    } else {
      const href = localizeHref(match[3], locale);
      out.push(
        href ? (
          <a
            key={`${keyPrefix}-${index}`}
            href={href}
            className="text-accent underline underline-offset-2 hover:brightness-110"
            {...(/^https?:/i.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {match[2]}
          </a>
        ) : (
          match[2]
        )
      );
    }
    last = index + match[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function RichText({ text, locale, className }: { text: string; locale: string; className?: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <div className={className}>
      {paragraphs.map((p, pi) => (
        <p key={pi} className={pi > 0 ? 'mt-2' : undefined}>
          {p.split('\n').map((line, li) => (
            <Fragment key={li}>
              {li > 0 && <br />}
              {renderInline(line, locale, `${pi}-${li}`)}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}

