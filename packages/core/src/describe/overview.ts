/**
 * The Overview's opening paragraph, built from facts only:
 * "This container sends 14 GA4 events to 2 measurement IDs. 3 tags are paused…"
 */
import type { Ga4Event } from '../ga4';
import type { EntityGraph } from '../graph';
import type { ContainerModel } from '../model';
import type { AuditResult } from '../rules/types';

const n = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const AREA_WORD: Record<string, string> = { ga4: 'GA4', ads: 'Google Ads', triggers: 'triggers', consent: 'consent', hygiene: 'container hygiene' };

/** Where a highlighted fact can take you in the app. `sub` is the part after the view in the URL hash (#triggers/unused). */
export interface SentenceLink {
  view: 'events' | 'triggers' | 'risks';
  sub?: string;
}
/** Plain text, or a highlighted fact that may link somewhere. */
export type SentencePart = string | { text: string; link?: SentenceLink };
export type Sentence = SentencePart[];

export const sentenceText = (s: Sentence): string => s.map((p) => (typeof p === 'string' ? p : p.text)).join('');
const mark = (text: string, link?: SentenceLink): SentencePart => (link ? { text, link } : { text });

/**
 * The Overview's opening paragraph as marked-up parts: key facts highlighted, and linked where there's a view to open.
 * Marks are kept to the facts that matter (counts of events, problems and unused items, container type); too many and none stand out.
 */
export function overviewParts(model: ContainerModel, graph: EntityGraph, events: Ga4Event[], result: AuditResult): Sentence[] {
  const out: Sentence[] = [];
  const mids = new Set(events.flatMap((e) => e.sends.map((s) => s.measurementId)).filter(Boolean));
  const active = model.tags.filter((t) => !t.paused);

  if (events.length) {
    out.push([
      'This container sends ',
      mark(n(events.length, 'GA4 event'), { view: 'events' }),
      ' to ',
      mark(n(mids.size, 'measurement ID')),
      ', from ',
      n(model.tags.filter((t) => t.type.key === 'gaawe').length, 'GA4 event tag'),
      '.',
    ]);
  } else if (!model.tags.some((t) => t.type.key === 'googtag')) {
    out.push(['This container has ', mark('no GA4 tags'), '. If the site uses GA4, it\'s set up outside Google Tag Manager.']);
  } else {
    out.push(['This container sends no GA4 events from event tags.']);
  }

  const others = new Map<string, number>();
  for (const t of active) {
    if (t.type.key === 'gaawe') continue;
    const label = t.type.template?.name ?? t.type.label;
    others.set(label, (others.get(label) ?? 0) + 1);
  }
  const top = [...others.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (top.length) {
    const parts: Sentence = ['Besides GA4, the biggest groups of active tags are '];
    top.forEach(([l, c], i) => parts.push(...(i ? [', '] : []), `${l} (${c})`));
    parts.push('.');
    out.push(parts);
  }

  const paused = model.tags.length - active.length;
  const hygiene: SentencePart[] = [];
  if (paused) hygiene.push(mark(n(paused, 'tag is', 'tags are') + ' paused'));
  if (graph.unusedTriggerIds.length) {
    hygiene.push(mark(`${n(graph.unusedTriggerIds.length, 'trigger isn\'t', 'triggers aren\'t')} used by anything`, { view: 'triggers', sub: 'unused' }));
  }
  if (graph.unusedVariableIds.length) hygiene.push(mark(`${n(graph.unusedVariableIds.length, 'variable isn\'t', 'variables aren\'t')} referenced anywhere`));
  if (hygiene.length) {
    const parts: Sentence = [];
    hygiene.forEach((h, i) => parts.push(...(i ? [', '] : []), h));
    parts.push('.');
    out.push(parts);
  }

  const crit = result.issues.filter((i) => i.severity === 'critical');
  const warn = result.issues.filter((i) => i.severity === 'warning');
  const risks: SentenceLink = { view: 'risks' };
  if (crit.length) {
    const areas = [...new Set(crit.map((i) => AREA_WORD[i.area]))];
    out.push([
      'We found ',
      mark(n(crit.length, 'critical issue'), risks),
      `, ${areas.length === 1 ? `${crit.length === 1 ? 'about' : 'all about'} ${areas[0]}` : `across ${areas.join(' and ')}`}, and `,
      warn.length ? mark(n(warn.length, 'warning'), risks) : 'no warnings',
      '.',
    ]);
  } else if (warn.length) {
    out.push(['We found no critical issues and ', mark(n(warn.length, 'warning'), risks), '.']);
  } else {
    out.push(['We found no critical issues or warnings.']);
  }

  const preview = result.issues.filter((i) => i.confidence === 'check-in-preview' && (i.severity === 'critical' || i.severity === 'warning')).length;
  if (preview) {
    out.push([`${n(preview, 'of those depends', 'of those depend')} on how the site behaves, so ${preview === 1 ? 'it\'s' : 'they\'re'} marked "Check in Preview".`]);
  }

  if (model.state.provisional) {
    out.push([
      'We\'ve read it as a ',
      mark(`${model.state.state} container`),
      '. Google\'s 2026 container changes aren\'t fully mapped yet, so if this container has been through the optimization flow, some findings may not apply.',
    ]);
  }
  return out;
}

/** The same paragraph as plain sentences (for tests and anywhere markup isn't wanted). */
export function overviewSentences(model: ContainerModel, graph: EntityGraph, events: Ga4Event[], result: AuditResult): string[] {
  return overviewParts(model, graph, events, result).map(sentenceText);
}
