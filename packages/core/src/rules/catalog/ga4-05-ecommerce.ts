import { activeSends, ALL_STATES, sendEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

export const GA4_05: Rule = {
  id: 'GA4-05',
  title: 'Purchase or value sent without the fields GA4 needs',
  area: 'ga4',
  severity: 'critical',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'Without transaction_id, GA4 can\'t de-duplicate purchases, so refreshes of the thank-you page count again. Without items, product reports stay empty. Without currency, GA4 ignores value entirely, so revenue reads zero.',
  fix: 'Add the missing parameters to the tag, or tick "Send Ecommerce data" so GA4 reads them from the ecommerce object in the data layer.',
  where: WHERE.tags,
  run({ events }) {
    const out: FindingDraft[] = [];
    for (const s of activeSends(events)) {
      // With "Send Ecommerce data" on, these come from the data layer and can't be checked from the export.
      if (s.sendEcommerceData) continue;
      const names = new Set(s.params.map((p) => p.name));
      if (s.eventName === 'purchase') {
        const missing = ['transaction_id', 'items'].filter((n) => !names.has(n));
        if (missing.length) {
          out.push({
            entity: sendEntity(s),
            message: `This purchase tag doesn't send ${missing.join(' or ')}, and "Send Ecommerce data" is off, so GA4 has no other way to get ${missing.length === 1 ? 'it' : 'them'}.`,
            detailKey: `purchase-missing:${missing.join(',')}`,
            detail: { missing },
          });
        }
      }
      if (names.has('value') && !names.has('currency')) {
        out.push({
          entity: sendEntity(s),
          message: `This tag sends value with "${s.eventName}" but no currency. GA4 ignores value without a currency.`,
          detailKey: 'value-without-currency',
        });
      }
    }
    return out;
  },
};
