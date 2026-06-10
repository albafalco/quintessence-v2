import type { AngolGrammarContent, GrammarBlock } from '@/lib/i18n-content';

function renderBlock(block: GrammarBlock, key: number) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p key={key} dangerouslySetInnerHTML={{ __html: block.html }} />
      );
    case 'list':
      if (block.ordered) {
        return (
          <ol key={key} className="list-decimal pl-5 space-y-2">
            {block.items.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ol>
        );
      }
      return (
        <ul key={key} className="list-disc pl-5 space-y-1">
          {block.items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ul>
      );
    case 'table':
      return (
        <table key={key} className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              {block.headers.map((header, i) => (
                <th key={i} className={i === 0 ? 'pb-2 pr-4' : 'pb-2 p-3'}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {block.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={ci === 0 ? 'py-2 pr-4' : 'p-3'}
                    dangerouslySetInnerHTML={{ __html: cell }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case 'note':
      return (
        <div key={key} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
          {block.paragraphs.map((p, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: p }} />
          ))}
        </div>
      );
    case 'mono':
      return (
        <div key={key} className="mt-4 rounded border border-primary/30 bg-primary/5 p-3 font-mono text-sm space-y-1">
          {block.lines.map((line, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: line }} />
          ))}
        </div>
      );
    default:
      return null;
  }
}

function GrammarPage({ page }: { page: AngolGrammarContent['szolapMagyarazat'] }) {
  return (
    <article className="prose prose-invert max-w-none space-y-8 text-foreground">
      <header>
        <h1 className="font-display text-3xl font-bold text-primary">{page.title}</h1>
        <p className="text-muted-foreground">{page.intro}</p>
      </header>
      {page.sections.map((section, si) => (
        <section key={si} className="space-y-4">
          <h2 className="text-xl font-semibold text-accent">{section.heading}</h2>
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            {section.blocks.map((block, bi) => renderBlock(block, bi))}
          </div>
        </section>
      ))}
    </article>
  );
}

export function GrammarContent({ content, sectionId }: { content: AngolGrammarContent; sectionId: number }) {
  if (sectionId === 1) return <GrammarPage page={content.szolapMagyarazat} />;
  if (sectionId === 2) return <GrammarPage page={content.nyelvtanI} />;
  return null;
}