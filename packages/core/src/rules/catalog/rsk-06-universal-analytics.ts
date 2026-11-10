import { ALL_STATES, tagEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

export const RSK_06: Rule = {
  id: 'RSK-06',
  title: 'Universal Analytics still in the container',
  area: 'hygiene',
  severity: 'housekeeping',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'Universal Analytics stopped processing data in 2024. These tags and settings do nothing except load code and clutter the container.',
  fix: 'Delete the Universal Analytics tags and the Google Analytics Settings variables that only they use.',
  where: WHERE.tags,
  run({ model }) {
    const out: FindingDraft[] = [];
    for (const t of model.tags) {
      if (t.type.key !== 'ua') continue;
      out.push({ entity: tagEntity(t), message: `This is a Universal Analytics tag${t.paused ? ' (paused)' : ''}.`, detailKey: 'ua' });
    }
    for (const v of model.variables) {
      if (v.type.key !== 'gas') continue;
      out.push({
        entity: { kind: 'variable', id: v.id, name: v.name },
        message: 'This is a Universal Analytics settings variable.',
        detailKey: 'gas',
        where: WHERE.variables,
      });
    }
    return out;
  },
};
