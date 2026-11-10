import { Fragment, type ReactNode } from 'react';

/**
 * Makes running text scannable without changing a word of it:
 * - "quoted names" (tags, triggers, events, parameters) render as mono chips, quotes dropped;
 *   quoted plain-English phrases (GTM settings like "Not set") stay in quotes, in the heading colour
 * - {{Variables}} render as mono chips in the accent colour
 * - with `numbers`, standalone numbers are emphasised (for the Overview summary)
 * Screen readers get the same text; the quotes are kept for them.
 */
const TOKEN = /("[^"\n]{1,120}"|“[^”\n]{1,120}”|\{\{[^{}]+\}\}|(?<![\d.])\b\d{1,3}(?:,\d{3})*\b(?![.,]?\d))/g;
/** Years and version-like numbers aren't counts. */
const NOT_A_COUNT = /^20\d\d$/;
/** A quoted plain-English phrase (a GTM setting such as "Not set"), as opposed to a name or identifier. */
const isPhrase = (s: string) => /\s/.test(s) && /^[A-Za-z ,']+$/.test(s);

export function Highlight({ text, numbers = false }: { text: string; numbers?: boolean }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const tok = m[0];
    const at = m.index ?? 0;
    const isNumber = /^\d/.test(tok);
    if (isNumber && (!numbers || NOT_A_COUNT.test(tok))) continue;
    if (at > last) parts.push(text.slice(last, at));
    if (isNumber) {
      parts.push(<strong key={at}>{tok}</strong>);
    } else if (tok.startsWith('{{')) {
      parts.push(<code key={at} className="hl hl-var">{tok}</code>);
    } else if (isPhrase(tok.slice(1, -1))) {
      parts.push(<strong key={at} className="hl-phrase">{tok}</strong>);
    } else {
      const inner = tok.slice(1, -1);
      parts.push(
        <Fragment key={at}>
          <span className="visually-hidden">“</span>
          <code className="hl">{inner}</code>
          <span className="visually-hidden">”</span>
        </Fragment>,
      );
    }
    last = at + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
