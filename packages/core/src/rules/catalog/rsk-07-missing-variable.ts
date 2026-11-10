import { ALL_STATES, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

const KIND_LABEL = { tag: 'tag', trigger: 'trigger', variable: 'variable' } as const;
const WHERE_FOR = { tag: WHERE.tags, trigger: WHERE.triggers, variable: WHERE.variables } as const;

export const RSK_07: Rule = {
  id: 'RSK-07',
  title: 'Reference to a variable that doesn\'t exist',
  area: 'hygiene',
  severity: 'critical',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'GTM reports an unknown variable as an error when you try to publish, which blocks the whole workspace. If the reference is a typo, whatever it was meant to send is missing.',
  fix: 'Correct the variable name, create the variable, or remove the reference.',
  where: WHERE.variables,
  run({ model }) {
    const out: FindingDraft[] = [];
    for (const e of [...model.tags, ...model.triggers, ...model.variables]) {
      const seen = new Set<string>();
      for (const r of e.varRefs) {
        if (seen.has(r.name)) continue;
        if (r.resolution.kind !== 'missing' && r.resolution.kind !== 'builtin-disabled') continue;
        seen.add(r.name);
        const disabled = r.resolution.kind === 'builtin-disabled';
        out.push({
          entity: { kind: e.kind, id: e.id, name: e.name },
          message: disabled
            ? `This ${KIND_LABEL[e.kind]} uses {{${r.name}}}, a built-in variable that isn't enabled in this container.`
            : `This ${KIND_LABEL[e.kind]} uses {{${r.name}}}, but no variable has that name.`,
          detailKey: r.name,
          detail: { variable: r.name, path: r.path },
          fix: disabled ? `Enable "${r.name}" in the built-in variables list.` : undefined,
          where: disabled ? WHERE.builtInVariables : WHERE_FOR[e.kind],
        });
      }
    }
    return out;
  },
};
