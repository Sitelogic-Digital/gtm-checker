import { ALL_STATES, isDynamic, list, plural, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

export const GA4_08: Rule = {
  id: 'GA4-08',
  title: 'Same event sent with different parameters',
  area: 'ga4',
  // Housekeeping since 2026-11-10: different forms sending different fields under one event name is usually intentional.
  severity: 'housekeeping',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'Several tags send this event name with different parameters. That\'s often intentional, such as two forms that collect different fields. Where it isn\'t, reports filtered on a missing parameter quietly undercount and show "(not set)" rows that are hard to trace back.',
  fix: 'If the difference is intentional, there\'s nothing to change. If every tag should send the same parameters, use one shared Event Settings variable for the event, with only the genuinely different values on each tag.',
  where: WHERE.tags,
  run({ events }) {
    const out: FindingDraft[] = [];
    for (const ev of events) {
      if (isDynamic(ev.name)) continue;
      const sends = ev.sends.filter((s) => !s.paused);
      if (sends.length < 2) continue;
      const sets = sends.map((s) => new Set(s.params.map((p) => p.name)));
      const all = new Set(sets.flatMap((s) => [...s]));
      const partial = [...all].filter((name) => sets.some((s) => !s.has(name))).sort();
      if (!partial.length) continue;
      const examples = partial.slice(0, 3).map((name) => {
        const missing = sends.filter((_, i) => !sets[i]!.has(name)).map((s) => s.tagName);
        return `"${name}" is missing from ${list(missing, 2)}`;
      });
      out.push({
        entity: { kind: 'event', id: ev.name, name: ev.name },
        related: sends.map((s) => ({ kind: 'tag', id: s.tagId, name: s.tagName })),
        message: `${plural(sends.length, 'tag')} send "${ev.name}", but not with the same parameters: ${examples.join('; ')}${partial.length > 3 ? `, plus ${plural(partial.length - 3, 'more parameter')}` : ''}.`,
        detailKey: partial.join(','),
        detail: { inconsistentParams: partial, tags: sends.map((s) => s.tagId) },
      });
    }
    return out;
  },
};
