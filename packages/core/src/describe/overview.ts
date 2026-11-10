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

export function overviewSentences(model: ContainerModel, graph: EntityGraph, events: Ga4Event[], result: AuditResult): string[] {
  const out: string[] = [];
  const mids = new Set(events.flatMap((e) => e.sends.map((s) => s.measurementId)).filter(Boolean));
  const active = model.tags.filter((t) => !t.paused);

  if (events.length) {
    out.push(`This container sends ${n(events.length, 'GA4 event')} to ${n(mids.size, 'measurement ID')}, from ${n(model.tags.filter((t) => t.type.key === 'gaawe').length, 'GA4 event tag')}.`);
  } else {
    out.push('This container sends no GA4 events from event tags.');
  }

  const others = new Map<string, number>();
  for (const t of active) {
    if (t.type.key === 'gaawe') continue;
    const label = t.type.template?.name ?? t.type.label;
    others.set(label, (others.get(label) ?? 0) + 1);
  }
  const top = [...others.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (top.length) out.push(`Besides GA4, the biggest groups of active tags are ${top.map(([l, c]) => `${l} (${c})`).join(', ')}.`);

  const paused = model.tags.length - active.length;
  const hygiene: string[] = [];
  if (paused) hygiene.push(`${n(paused, 'tag is', 'tags are')} paused`);
  if (graph.unusedTriggerIds.length) hygiene.push(`${n(graph.unusedTriggerIds.length, 'trigger isn\'t', 'triggers aren\'t')} used by anything`);
  if (graph.unusedVariableIds.length) hygiene.push(`${n(graph.unusedVariableIds.length, 'variable isn\'t', 'variables aren\'t')} referenced anywhere`);
  if (hygiene.length) out.push(`${hygiene.join(', ').replace(/^./, (c) => c.toUpperCase())}.`);

  const crit = result.issues.filter((i) => i.severity === 'critical');
  const warn = result.issues.filter((i) => i.severity === 'warning');
  if (crit.length) {
    const areas = [...new Set(crit.map((i) => AREA_WORD[i.area]))];
    out.push(`We found ${n(crit.length, 'critical issue')}, ${areas.length === 1 ? `${crit.length === 1 ? 'about' : 'all about'} ${areas[0]}` : `across ${areas.join(' and ')}`}, and ${n(warn.length, 'warning')}.`);
  } else if (warn.length) {
    out.push(`We found no critical issues and ${n(warn.length, 'warning')}.`);
  } else {
    out.push('We found no critical issues or warnings.');
  }

  const preview = result.issues.filter((i) => i.confidence === 'check-in-preview' && (i.severity === 'critical' || i.severity === 'warning')).length;
  if (preview) out.push(`${n(preview, 'of those depends', 'of those depend')} on how the site behaves, so ${preview === 1 ? 'it\'s' : 'they\'re'} marked "Check in Preview".`);

  if (model.state.provisional) {
    out.push(`We've read it as a ${model.state.state} container. Google's 2026 container changes aren't fully mapped yet, so if this container has been through the optimization flow, some findings may not apply.`);
  }
  return out;
}
