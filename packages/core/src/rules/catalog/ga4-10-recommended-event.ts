import { RECOMMENDED_EVENTS } from '../../config/recommended-events';
import { ALL_STATES, isDynamic, normaliseName, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

const BY_NORMALISED = new Map(RECOMMENDED_EVENTS.names.map((n) => [normaliseName(n), n]));

export function recommendedFor(eventName: string): string | undefined {
  const n = normaliseName(eventName);
  const rec = RECOMMENDED_EVENTS.synonyms[n] ?? BY_NORMALISED.get(n);
  return rec && rec !== eventName ? rec : undefined;
}

export const GA4_10: Rule = {
  id: 'GA4-10',
  title: 'Custom event that should be a recommended event',
  area: 'ga4',
  severity: 'warning',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'GA4 builds reports, audiences and Google Ads conversion imports around its recommended event names. A custom name that means the same thing misses all of that, and the data won\'t line up with GA4\'s documentation or other properties.',
  fix: 'Rename the event to the recommended name and use its recommended parameters. If anything downstream (key events, audiences, Looker Studio) uses the old name, update it at the same time.',
  where: WHERE.tags,
  run({ events }) {
    const out: FindingDraft[] = [];
    for (const ev of events) {
      if (isDynamic(ev.name)) continue;
      const rec = recommendedFor(ev.name);
      if (!rec) continue;
      const active = ev.sends.filter((s) => !s.paused);
      if (!active.length) continue;
      out.push({
        entity: { kind: 'event', id: ev.name, name: ev.name },
        related: active.map((s) => ({ kind: 'tag', id: s.tagId, name: s.tagName })),
        message: `"${ev.name}" looks like GA4's recommended event "${rec}".`,
        detailKey: rec,
        detail: { recommended: rec },
      });
    }
    return out;
  },
};
