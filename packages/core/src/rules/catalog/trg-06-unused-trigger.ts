import { ALL_STATES, triggerEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

export const TRG_06: Rule = {
  id: 'TRG-06',
  title: 'Trigger not used by any tag',
  area: 'hygiene',
  severity: 'housekeeping',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'Unused triggers make the container harder to read and easy to attach to the wrong tag by mistake.',
  fix: 'Delete the trigger, or attach it to the tag it was meant for.',
  where: WHERE.triggers,
  run({ graph }) {
    const out: FindingDraft[] = [];
    for (const id of graph.unusedTriggerIds) {
      const t = graph.triggersById.get(id)!;
      out.push({ entity: triggerEntity(t), message: 'No tag uses this trigger, directly or through a trigger group.', detailKey: 'unused' });
    }
    return out;
  },
};
