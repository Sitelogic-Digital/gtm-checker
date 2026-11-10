import { GA4_LIMITS } from '../../config/ga4-limits';
import { activeSends, ALL_STATES, sendEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

const MAX = GA4_LIMITS.paramsPerEvent.value;

const ORIGIN_LABEL = {
  tag: 'on the tag',
  'event-settings-variable': 'from the Event Settings variable',
  'google-tag-shared': 'from the Google tag',
} as const;

export const GA4_02: Rule = {
  id: 'GA4-02',
  title: `More than ${MAX} parameters on one event`,
  area: 'ga4',
  severity: 'critical',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: `A standard GA4 property keeps ${MAX} parameters per event and drops the rest, and you can't choose which. Analytics 360 properties have a higher limit; if this is one, you can ignore this.`,
  fix: 'Remove parameters you don\'t report on, or move shared ones into user properties. Check the Event Settings variable and the Google tag too: their parameters count towards the same limit.',
  where: WHERE.tags,
  run({ events }) {
    const out: FindingDraft[] = [];
    for (const s of activeSends(events)) {
      if (s.params.length <= MAX) continue;
      const byOrigin = new Map<string, number>();
      for (const p of s.params) byOrigin.set(p.origin, (byOrigin.get(p.origin) ?? 0) + 1);
      const breakdown = (['tag', 'event-settings-variable', 'google-tag-shared'] as const)
        .filter((o) => byOrigin.has(o))
        .map((o) => [o, byOrigin.get(o)!] as const)
        .map(([o, n]) => `${n} ${ORIGIN_LABEL[o as keyof typeof ORIGIN_LABEL]}`).join(', ');
      out.push({
        entity: sendEntity(s),
        message: `This tag sends ${s.params.length} parameters with "${s.eventName}" (${breakdown}). GA4 keeps ${MAX}.`,
        detailKey: s.eventName,
        detail: { eventName: s.eventName, count: s.params.length, params: s.params.map((p) => p.name) },
      });
    }
    return out;
  },
};
