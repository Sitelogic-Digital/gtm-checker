import { activeSends, ALL_STATES, isDynamic, normaliseName, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

export const GA4_09: Rule = {
  id: 'GA4-09',
  title: 'Parameter names that differ only in spelling',
  area: 'ga4',
  severity: 'warning',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'GA4 treats form_name and formName as two different parameters. Each needs its own custom dimension, and any report on "form name" only shows half the data.',
  fix: 'Pick one spelling (GA4\'s own convention is snake_case) and use it on every tag. Then register that one name as a custom dimension in GA4.',
  where: WHERE.tags,
  run({ events }) {
    const groups = new Map<string, Map<string, Set<string>>>();
    for (const s of activeSends(events)) {
      for (const p of s.params) {
        if (isDynamic(p.name)) continue;
        const key = normaliseName(p.name);
        const spellings = groups.get(key) ?? new Map<string, Set<string>>();
        const evs = spellings.get(p.name) ?? new Set<string>();
        evs.add(s.eventName);
        spellings.set(p.name, evs);
        groups.set(key, spellings);
      }
    }
    const out: FindingDraft[] = [];
    for (const [key, spellings] of groups) {
      if (spellings.size < 2) continue;
      const names = [...spellings.keys()].sort();
      const described = names.map((n) => {
        const evs = [...spellings.get(n)!].sort();
        return `"${n}" (${evs.slice(0, 3).join(', ')}${evs.length > 3 ? ` and ${evs.length - 3} more` : ''})`;
      });
      out.push({
        entity: { kind: 'parameter', id: key, name: names.join(' / ') },
        message: `These look like the same parameter spelled differently: ${described.join(', ')}.`,
        detailKey: names.join('|'),
        detail: { spellings: Object.fromEntries(names.map((n) => [n, [...spellings.get(n)!].sort()])) },
      });
    }
    return out;
  },
};
