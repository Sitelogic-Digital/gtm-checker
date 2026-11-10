import { GA4_LIMITS } from '../../config/ga4-limits';
import { activeSends, ALL_STATES, isDynamic, sendEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

const MAX = GA4_LIMITS.eventNameMaxLength.value;

export const GA4_01: Rule = {
  id: 'GA4-01',
  title: 'Event name that breaks GA4\'s naming rules',
  area: 'ga4',
  severity: 'critical',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  // Critical only for what Google documents as a hard failure (no name, over the length limit); characters alone are a Warning.
  why: `GA4 doesn't process event names over ${MAX} characters, and a key event over ${MAX} characters can't be counted as a key event. Nothing in GTM or Preview warns you.`,
  fix: `Rename the event in the tag's Event Name field. Start with a letter, use only letters, numbers and underscores, and keep it to ${MAX} characters or fewer.`,
  where: WHERE.tags,
  run({ events }) {
    const out: FindingDraft[] = [];
    for (const s of activeSends(events)) {
      const name = s.eventName;
      if (isDynamic(name)) continue;
      const problems: string[] = [];
      if (name === '') problems.push('has no event name');
      if (name.length > MAX) problems.push(`is ${name.length} characters long (the limit is ${MAX})`);
      const hard = problems.length > 0;
      if (name && !/^\p{L}/u.test(name)) problems.push('starts with something other than a letter');
      const bad = [...new Set(name.match(/[^\p{L}\p{N}_]/gu) ?? [])];
      if (bad.length) problems.push(`contains ${bad.map((c) => (c === ' ' ? 'spaces' : `"${c}"`)).join(', ')}`);
      if (!problems.length) continue;
      out.push({
        entity: sendEntity(s),
        message: name === '' ? 'This GA4 event tag has no event name.' : `This tag sends "${name}", which ${problems.join(' and ')}.`,
        detailKey: name,
        detail: { eventName: name, problems },
        ...(hard ? {} : { severity: 'warning' as const, why: 'Google\'s naming rules say event names must start with a letter and use only letters, numbers and underscores. Google doesn\'t document what happens to names that break them; they can still show up in reports but cause trouble later, for example in audiences, key events and comparisons, and nothing in GTM or Preview warns you.' }),
      });
    }
    return out;
  },
};
