import { ALL_STATES, list, triggerEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

export const TRG_03: Rule = {
  id: 'TRG-03',
  title: 'Click trigger with no conditions feeding a GA4 event',
  area: 'triggers',
  severity: 'warning',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'An unconditioned click trigger fires on every click on the site. The GA4 event behind it floods reports with noise and can push the property towards its event limits.',
  fix: 'Change the trigger to "Some Clicks" or "Some Link Clicks" and add a condition that targets the element you care about, such as Click ID, Click Classes or Click URL.',
  where: WHERE.triggers,
  run({ model, graph, events }) {
    const out: FindingDraft[] = [];
    const eventByTag = new Map(events.flatMap((e) => e.sends.map((s) => [s.tagId, s.eventName] as const)));
    for (const t of model.triggers) {
      if (t.type.key !== 'CLICK' && t.type.key !== 'LINK_CLICK') continue;
      if (t.filters.length) continue;
      const tagIds = graph.tagsByTrigger.get(t.id)?.firing ?? [];
      const ga4 = tagIds
        .map((id) => graph.tagsById.get(id))
        .filter((tag) => tag && !tag.paused && tag.type.key === 'gaawe');
      if (!ga4.length) continue;
      const names = [...new Set(ga4.map((tag) => eventByTag.get(tag!.id) ?? tag!.name))];
      out.push({
        entity: triggerEntity(t),
        related: ga4.map((tag) => ({ kind: 'tag', id: tag!.id, name: tag!.name })),
        message: `This trigger fires on every ${t.type.key === 'CLICK' ? 'click on any element' : 'link click'} on the site, and sends ${list(names, 3)} to GA4 each time. You probably wanted specific ${t.type.key === 'CLICK' ? 'elements' : 'links'} only.`,
        detailKey: t.type.key,
      });
    }
    return out;
  },
};
