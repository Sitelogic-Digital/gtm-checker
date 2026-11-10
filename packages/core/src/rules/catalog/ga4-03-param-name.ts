import { GA4_LIMITS } from '../../config/ga4-limits';
import { GA4_RESERVED } from '../../config/ga4-reserved';
import type { Ga4Param } from '../../ga4';
import { activeSends, ALL_STATES, isDynamic, WHERE } from '../helpers';
import type { FindingDraft, FindingEntity, Rule } from '../types';

const PARAM_MAX = GA4_LIMITS.paramNameMaxLength.value;
const UP_MAX = GA4_LIMITS.userPropertyNameMaxLength.value;

function problemsFor(name: string, max: number, prefixes: readonly string[]): string[] {
  const p: string[] = [];
  if (name.length > max) p.push(`is ${name.length} characters long (the limit is ${max})`);
  if (!/^\p{L}/u.test(name) && !name.startsWith('_')) p.push('starts with something other than a letter');
  const prefix = prefixes.find((x) => name.toLowerCase().startsWith(x));
  if (prefix) p.push(`starts with "${prefix}", which GA4 reserves`);
  const bad = [...new Set(name.match(/[^\p{L}\p{N}_]/gu) ?? [])].filter((c) => !(prefix === 'gtag.' && c === '.'));
  if (bad.length) p.push(`contains ${bad.map((c) => (c === ' ' ? 'spaces' : `"${c}"`)).join(', ')}`);
  return p;
}

const definedIn = (p: Ga4Param): FindingEntity => ({ kind: p.definedIn.kind, id: p.definedIn.id, name: p.definedIn.name });

export const GA4_03: Rule = {
  id: 'GA4-03',
  title: 'Parameter or user property name GA4 will reject',
  area: 'ga4',
  severity: 'critical',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'GA4 drops parameters and user properties whose names break its rules. The event still arrives, so the gap is easy to miss until you try to build a report on it.',
  fix: `Rename it. Start with a letter, use only letters, numbers and underscores, avoid the reserved prefixes (_, firebase_, ga_, google_, gtag.), and keep parameter names to ${PARAM_MAX} characters and user property names to ${UP_MAX}.`,
  where: WHERE.tags,
  run({ events }) {
    const out: FindingDraft[] = [];
    for (const s of activeSends(events)) {
      for (const [list, max, prefixes, label] of [
        [s.params, PARAM_MAX, GA4_RESERVED.paramNamePrefixes, 'parameter'],
        [s.userProperties, UP_MAX, GA4_RESERVED.userPropertyPrefixes, 'user property'],
      ] as const) {
        for (const p of list) {
          if (isDynamic(p.name)) continue;
          const problems = problemsFor(p.name, max, prefixes);
          if (!problems.length) continue;
          const where = p.definedIn.kind === 'variable' ? WHERE.variables : WHERE.tags;
          out.push({
            entity: definedIn(p),
            message: `The ${label} "${p.name}" ${problems.join(' and ')}.`,
            detailKey: `${label}:${p.name}`,
            detail: { name: p.name, kind: label, problems, eventName: s.eventName },
            where,
          });
        }
      }
    }
    return out;
  },
};
