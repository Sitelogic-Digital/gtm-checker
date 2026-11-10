import { tagEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

/**
 * Only runs on Optimized containers, which we can't detect yet (see catalog/gtm-2026.ts).
 * Kept so the opposite advice to RSK-02 is in place the day detection works.
 */
export const RSK_03: Rule = {
  id: 'RSK-03',
  title: 'Conversion Linker still present after optimization',
  area: 'hygiene',
  severity: 'housekeeping',
  confidence: 'definite',
  appliesTo: ['Optimized'],
  why: 'In an optimized container, destination tags store the ad click ID themselves, so the Conversion Linker is legacy. It does no harm, but it suggests the migration wasn\'t finished.',
  fix: 'Delete the Conversion Linker once you\'ve confirmed in Preview that the destination tags set the _gcl_ cookies.',
  where: WHERE.tags,
  run({ model }) {
    return model.tags
      .filter((t) => t.type.key === 'gclidw')
      .map<FindingDraft>((t) => ({ entity: tagEntity(t), message: 'This container is optimized but still has a Conversion Linker tag.', detailKey: 'gclidw' }));
  },
};
