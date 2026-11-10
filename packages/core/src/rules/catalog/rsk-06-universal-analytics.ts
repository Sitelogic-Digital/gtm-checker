import { ALL_STATES, tagEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

export const RSK_06: Rule = {
  id: 'RSK-06',
  title: 'Universal Analytics or Google Optimize still in the container',
  area: 'hygiene',
  severity: 'housekeeping',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'Universal Analytics stopped processing data in July 2023 (July 2024 for Analytics 360 properties), and Google Optimize shut down in September 2023. These tags and settings do nothing except load code and clutter the container.',
  fix: 'Delete the Universal Analytics and Google Optimize tags, and the Google Analytics Settings variables that only they use.',
  where: WHERE.tags,
  run({ model }) {
    const out: FindingDraft[] = [];
    for (const t of model.tags) {
      if (t.type.key === 'ua') {
        out.push({ entity: tagEntity(t), message: `This is a Universal Analytics tag${t.paused ? ' (paused)' : ''}.`, detailKey: 'ua' });
      } else if (t.type.key === 'opt') {
        out.push({ entity: tagEntity(t), message: `This is a Google Optimize tag${t.paused ? ' (paused)' : ''}.`, detailKey: 'opt' });
      }
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
