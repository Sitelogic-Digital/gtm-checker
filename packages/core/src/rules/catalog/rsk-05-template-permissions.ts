import { describeTemplate } from '../../templates';
import { ALL_STATES, list, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

export const RSK_05: Rule = {
  id: 'RSK-05',
  title: 'Community template with broad permissions',
  area: 'hygiene',
  severity: 'warning',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'Templates have to declare what they\'re allowed to do. One that can load scripts or send data anywhere has the same reach as Custom HTML, and an update from its author can change what it does.',
  fix: 'Check whether a more tightly scoped template does the same job. If you keep this one, open it under Templates, review its Permissions tab, and note who owns it.',
  where: WHERE.templates,
  run({ model }) {
    const out: FindingDraft[] = [];
    for (const tpl of model.templates) {
      if (!tpl.broadPermissions.length) continue;
      const users = [...model.tags, ...model.variables].filter((e) => e.type.template?.templateId === tpl.templateId);
      if (!users.length) continue;
      out.push({
        entity: { kind: 'template', id: tpl.templateId, name: tpl.name },
        related: users.map((e) => ({ kind: e.kind, id: e.id, name: e.name })),
        message: `${describeTemplate(tpl)} is allowed to ${tpl.broadPermissions.join(', ')}. It's used by ${list(users.map((u) => u.name), 3)}.`,
        detailKey: tpl.broadPermissions.join('|'),
        detail: { permissions: tpl.broadPermissions },
      });
    }
    return out;
  },
};
