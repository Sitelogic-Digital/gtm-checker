import { GA4_LIMITS } from '../../config/ga4-limits';
import { GA4_RESERVED } from '../../config/ga4-reserved';
import type { Ga4Param } from '../../ga4';
import { activeSends, ALL_STATES, isDynamic, WHERE } from '../helpers';
import type { FindingDraft, FindingEntity, Rule } from '../types';

const PARAM_MAX = GA4_LIMITS.paramNameMaxLength.value;
const UP_MAX = GA4_LIMITS.userPropertyNameMaxLength.value;

/** `hard` problems are ones Google documents as failures (length, reserved prefixes); the rest only break the naming rules. */
function problemsFor(name: string, max: number, prefixes: readonly string[]): { problems: string[]; hard: boolean } {
  const p: string[] = [];
  if (name.length > max) p.push(`is ${name.length} characters long (the limit is ${max})`);
  const prefix = prefixes.find((x) => name.toLowerCase().startsWith(x));
  if (prefix) p.push(`starts with "${prefix}", which GA4 reserves`);
  const hard = p.length > 0;
  if (!/^\p{L}/u.test(name) && !name.startsWith('_')) p.push('starts with something other than a letter');
  const bad = [...new Set(name.match(/[^\p{L}\p{N}_]/gu) ?? [])].filter((c) => !(prefix === 'gtag.' && c === '.'));
  if (bad.length) p.push(`contains ${bad.map((c) => (c === ' ' ? 'spaces' : `"${c}"`)).join(', ')}`);
  return { problems: p, hard };
}

const definedIn = (p: Ga4Param): FindingEntity => ({ kind: p.definedIn.kind, id: p.definedIn.id, name: p.definedIn.name });

export const GA4_03: Rule = {
  id: 'GA4-03',
  title: 'Parameter or user property name that breaks GA4\'s rules',
  area: 'ga4',
  severity: 'critical',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  // Critical only for documented failures (length, reserved prefixes); characters alone are a Warning.
  why: 'GA4 doesn\'t accept parameter and user property names that are over the length limit or use a reserved prefix. The event still arrives, so the gap is easy to miss until you try to build a report on it.',
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
          const { problems, hard } = problemsFor(p.name, max, prefixes);
          if (!problems.length) continue;
          const where = p.definedIn.kind === 'variable' ? WHERE.variables : WHERE.tags;
          out.push({
            entity: definedIn(p),
            message: `The ${label} "${p.name}" ${problems.join(' and ')}.`,
            detailKey: `${label}:${p.name}`,
            detail: { name: p.name, kind: label, problems, eventName: s.eventName },
            where,
            ...(hard ? {} : { severity: 'warning' as const, why: 'Google\'s naming rules say parameter and user property names must start with a letter and use only letters, numbers and underscores. Google doesn\'t document what happens to names that break them, and they can be hard or impossible to use as custom dimensions, so the data may be there but not reportable.' }),
          });
        }
      }
    }
    return out;
  },
};
