import { GA4_RESERVED } from '../../config/ga4-reserved';
import { activeSends, ALL_STATES, isDynamic, sendEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

const REJECTED = new Set<string>(GA4_RESERVED.rejectedEventNames);
const ENHANCED = new Set<string>(GA4_RESERVED.enhancedMeasurementEventNames);

export const GA4_04: Rule = {
  id: 'GA4-04',
  title: 'Reserved event name',
  area: 'ga4',
  severity: 'critical',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'GA4 reserves these names for events it collects itself. Sending them from GTM gets the event rejected, or mixes your data into GA4\'s own counts.',
  fix: 'Rename the event to something specific to what happened, ideally a GA4 recommended event name.',
  where: WHERE.tags,
  run({ events }) {
    const out: FindingDraft[] = [];
    for (const s of activeSends(events)) {
      const name = s.eventName;
      if (isDynamic(name)) continue;
      if (REJECTED.has(name)) {
        out.push({
          entity: sendEntity(s),
          message: `This tag sends "${name}", which GA4 reserves for its own automatic events.`,
          detailKey: name,
        });
        continue;
      }
      const prefix = GA4_RESERVED.eventNamePrefixes.find((p) => name.toLowerCase().startsWith(p));
      if (prefix) {
        out.push({
          entity: sendEntity(s),
          message: `This tag sends "${name}". Event names can't start with "${prefix}"; GA4 reserves that prefix.`,
          detailKey: name,
        });
        continue;
      }
      if (ENHANCED.has(name)) {
        out.push({
          entity: sendEntity(s),
          severity: 'warning',
          confidence: 'check-in-preview',
          message: `This tag sends "${name}", which GA4's enhanced measurement also sends automatically. If enhanced measurement is on for this stream, you'll count it twice, with two different sets of parameters.`,
          why: 'Two sources for the same event name double the count and split its parameters, and reports can\'t tell them apart.',
          fix: `Either turn off the matching enhanced measurement option in GA4 (Admin → Data streams → your stream → Enhanced measurement), or rename this event to something more specific, such as "${name}_custom".`,
          detailKey: name,
        });
      }
    }
    return out;
  },
};
