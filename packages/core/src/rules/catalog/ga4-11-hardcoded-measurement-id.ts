import { paramString } from '../../params';
import { plural, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

const MID = /^G-[A-Z0-9]+$/i;

export const GA4_11: Rule = {
  id: 'GA4-11',
  title: 'Measurement ID typed into several tags',
  area: 'hygiene',
  severity: 'housekeeping',
  confidence: 'definite',
  appliesTo: ['Legacy'],
  why: 'When the same ID is typed into many tags, changing property means finding and editing every one, and a typo in one tag sends its data somewhere else without any error.',
  fix: 'Create a Constant variable holding the ID and use it in every tag.',
  where: WHERE.variables,
  run({ model }) {
    const byId = new Map<string, Array<{ id: string; name: string }>>();
    for (const t of model.tags) {
      const raw =
        t.type.key === 'gaawe' ? paramString(t.params, 'measurementIdOverride') :
        t.type.key === 'googtag' || t.type.key === 'gaawc' ? paramString(t.params, 'tagId') ?? paramString(t.params, 'measurementId') :
        undefined;
      const v = raw?.trim();
      if (!v || !MID.test(v)) continue;
      const id = v.toUpperCase();
      byId.set(id, [...(byId.get(id) ?? []), { id: t.id, name: t.name }]);
    }
    const out: FindingDraft[] = [];
    for (const [mid, tags] of byId) {
      if (tags.length < 2) continue;
      out.push({
        entity: { kind: 'measurement-id', id: mid, name: mid },
        related: tags.map((t) => ({ kind: 'tag', ...t })),
        message: `${mid} is typed directly into ${plural(tags.length, 'tag')} instead of coming from one variable.`,
        detailKey: mid,
        detail: { tagIds: tags.map((t) => t.id) },
      });
    }
    return out;
  },
};
