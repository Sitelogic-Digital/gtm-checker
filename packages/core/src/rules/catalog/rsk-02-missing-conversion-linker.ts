import { resolveConstant } from '../../ga4';
import { paramString } from '../../params';
import { plural, tagEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

export const RSK_02: Rule = {
  id: 'RSK-02',
  title: 'Google Ads conversions with no Conversion Linker',
  area: 'ads',
  severity: 'critical',
  confidence: 'definite',
  appliesTo: ['Legacy'],
  why: 'The Conversion Linker stores the ad click ID (gclid) in a first-party cookie. Without it, or a Google tag for the Ads account, conversions in browsers that block third-party cookies can\'t be tied back to the click, so Google Ads under-reports and bids on bad data.',
  fix: 'Add a Conversion Linker tag firing on All Pages (or on Initialization - All Pages). Alternatively, add a Google tag for the AW- conversion ID, which does the same job.',
  where: WHERE.tags,
  run({ model, graph }) {
    const active = model.tags.filter((t) => !t.paused);
    const conversions = active.filter((t) => t.type.key === 'awct');
    if (!conversions.length) return [];
    if (active.some((t) => t.type.key === 'gclidw')) return [];
    const adsGoogleTag = active.some(
      (t) => t.type.key === 'googtag' && /^(AW|GT)-/i.test(resolveConstant(paramString(t.params, 'tagId') ?? '', graph)),
    );
    if (adsGoogleTag) return [];
    const out: FindingDraft[] = [
      {
        entity: { kind: 'container', id: model.meta.publicId, name: model.meta.publicId },
        related: conversions.map(tagEntity),
        message: `This container has ${plural(conversions.length, 'Google Ads conversion tag')} but no active Conversion Linker and no Google tag for an Ads account.`,
        detailKey: 'no-linker',
      },
    ];
    return out;
  },
};
