import { ALL_STATES, normaliseName, triggerEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

export const TRG_04: Rule = {
  id: 'TRG-04',
  title: 'Custom Event triggers that differ only in spelling',
  area: 'triggers',
  severity: 'warning',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'Data layer event names are matched exactly. If the site pushes "formSubmit" and the trigger waits for "form_submit", nothing fires and nothing errors. Near-identical triggers usually mean one of them is waiting for an event that never arrives.',
  fix: 'Check in Preview which spelling the site actually pushes, point every tag at the trigger with that spelling, and delete the other.',
  where: WHERE.triggers,
  run({ model }) {
    const groups = new Map<string, Map<string, Array<{ id: string; name: string }>>>();
    for (const t of model.triggers) {
      if (t.type.key !== 'CUSTOM_EVENT') continue;
      for (const c of t.customEventFilters) {
        if (c.left !== '{{_event}}' || c.operator !== 'EQUALS' || c.negate || !c.right) continue;
        const key = normaliseName(c.right);
        const spellings = groups.get(key) ?? new Map();
        spellings.set(c.right, [...(spellings.get(c.right) ?? []), { id: t.id, name: t.name }]);
        groups.set(key, spellings);
      }
    }
    const out: FindingDraft[] = [];
    for (const [key, spellings] of groups) {
      if (spellings.size < 2) continue;
      const names = [...spellings.keys()].sort();
      const triggers = names.flatMap((n) => spellings.get(n)!);
      out.push({
        entity: { kind: 'custom-event', id: key, name: names.join(' / ') },
        related: triggers.map(triggerEntity),
        message: `These Custom Event triggers wait for events that differ only in case or separators: ${names.map((n) => `"${n}" (${spellings.get(n)!.map((t) => t.name).join(', ')})`).join(', ')}.`,
        detailKey: names.join('|'),
      });
    }
    return out;
  },
};
