import { Fragment } from 'react';
import { cn } from '@/lib/utils';

/** One paragraph of the content files: `*text*` is italic, `\n` a line break. */
function renderInline(text: string) {
  return text.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') ? (
      <em key={i} className="text-cream">{part.slice(1, -1)}</em>
    ) : (
      <Fragment key={i}>
        {part.split('\n').map((line, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {line}
          </Fragment>
        ))}
      </Fragment>
    )
  );
}

export function Prose({ paragraphs, className }: { paragraphs: string[]; className?: string }) {
  return (
    <div className={cn('space-y-3 text-[0.97rem] leading-relaxed text-cream/90', className)}>
      {paragraphs.map((p, i) => (
        <p key={i}>{renderInline(p)}</p>
      ))}
    </div>
  );
}
