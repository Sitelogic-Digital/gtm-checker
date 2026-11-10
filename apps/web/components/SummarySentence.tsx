import type { Sentence } from '@gtm-audit/core';

/**
 * One Overview summary sentence. Key facts get a highlighter mark; facts with a view to open
 * are links (underlined as well as marked, so they don't rely on colour). In the printed report
 * (`links={false}`) every fact is just marked.
 */
export function SummarySentence({ s, links = true }: { s: Sentence; links?: boolean }) {
  return (
    <>
      {s.map((p, i) => {
        if (typeof p === 'string') return p;
        if (links && p.link) {
          const href = `#${p.link.view}${p.link.sub ? `/${p.link.sub}` : ''}`;
          return <a key={i} className="fact fact-link" href={href}>{p.text}</a>;
        }
        return <mark key={i} className="fact">{p.text}</mark>;
      })}
    </>
  );
}
