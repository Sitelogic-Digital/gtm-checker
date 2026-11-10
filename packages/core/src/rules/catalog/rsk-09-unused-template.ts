import { resolveTemplate } from '../../templates';
import { ALL_STATES, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

/**
 * A custom template that no tag or variable uses. Found in both of the first two
 * client containers (an old pixel and a replaced cookie banner), 2026-11-10.
 */
export const RSK_09: Rule = {
  id: 'RSK-09',
  title: 'Custom template not used by any tag or variable',
  area: 'hygiene',
  severity: 'housekeeping',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'A template left behind after a tool is removed or replaced does nothing on its own, but it clutters the Templates list and keeps its permissions in the container, ready to be reused by mistake.',
  fix: 'If nothing should use it any more, delete the template. If a tag is meant to use it, create or restore that tag.',
  where: WHERE.templates,
  run({ model }) {
    const used = new Set<string>();
    for (const e of [...model.tags, ...model.variables]) {
      const t = resolveTemplate(e.type.key, model.templates);
      if (t) used.add(t.templateId);
    }
    const out: FindingDraft[] = [];
    for (const t of model.templates) {
      if (used.has(t.templateId)) continue;
      out.push({
        entity: { kind: 'template', id: t.templateId, name: t.name },
        message: 'No tag or variable in this container uses this template.',
        detailKey: 'unused',
      });
    }
    return out;
  },
};
