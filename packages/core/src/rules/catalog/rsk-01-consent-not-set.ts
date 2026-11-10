import { lookupDomain } from '../../config/known-domains';
import type { Tag } from '../../model';
import { paramString } from '../../params';
import { ALL_STATES, BUILT_IN_CONSENT, tagEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule, RuleContext } from '../types';
import { scriptSources } from './rsk-04-custom-html';

const MARKETING_TYPES = new Set(['bzi', 'pntr', 'img']);
const CMP_TEMPLATE = /consent|cookie|cmp|onetrust|cookiebot|usercentrics|termly|iubenda|complianz|didomi|osano|cookieyes|quantcast choice/i;
const CONSENT_TRIGGER = /consent|cookie|gdpr|ccpa|cmp|onetrust|cookiebot|usercentrics|optanon|marketing.?allowed|ad.?storage/i;
const PIXEL_CODE = /\b(fbq|lintrk|_linkedin_partner_id|ttq|snaptr|uetq|twq|pintrk|obApi|rdt|_tfa|adroll_adv_id|gtag\s*\(\s*['"]config['"]\s*,\s*['"]AW-)/;

/** Why we think this tag is advertising or marketing, or undefined if we don't. */
export function marketingReason(t: Tag): string | undefined {
  if (BUILT_IN_CONSENT.has(t.type.key)) return undefined;
  if (MARKETING_TYPES.has(t.type.key)) return t.type.label;
  if (t.type.template) {
    if (CMP_TEMPLATE.test(t.type.template.name)) return undefined;
    return t.type.template.name;
  }
  if (t.type.key === 'html') {
    const html = paramString(t.params, 'html') ?? '';
    const vendor = scriptSources(html).map((u) => lookupDomain(u.host)).find((d) => d?.marketing);
    if (vendor) return `Custom HTML loading ${vendor.vendor}`;
    if (PIXEL_CODE.test(html)) return 'Custom HTML containing an advertising pixel';
  }
  return undefined;
}

/** Firing or blocking triggers that look like a consent platform's gate. */
export function consentGate(t: Tag, ctx: RuleContext): string | undefined {
  for (const id of [...t.firingTriggerIds, ...t.blockingTriggerIds]) {
    const trg = ctx.graph.triggersById.get(id);
    if (!trg) continue;
    if (CONSENT_TRIGGER.test(trg.name)) return trg.name;
    if (trg.customEventFilters.some((c) => CONSENT_TRIGGER.test(c.right))) return trg.name;
  }
  return undefined;
}

export const RSK_01: Rule = {
  id: 'RSK-01',
  title: 'Advertising or marketing tag with no consent setting',
  area: 'consent',
  severity: 'critical',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'Google\'s tags and a few others (such as Microsoft UET) have built-in consent checks; most other vendors\' tags don\'t. With consent "Not set" and nothing else blocking it, this tag fires whether or not the visitor has accepted marketing cookies, and the container records no decision about it either way.',
  fix: 'Check with whoever owns the site\'s consent policy how this tag should behave. To make it wait for consent, open the tag and go to Advanced Settings → Consent Settings → "Require additional consent for tag to fire", then add the consent types your policy calls for. To record that it doesn\'t need consent, choose "No additional consent required". The Consent overview lists every tag that\'s still "Not set".',
  where: WHERE.consentOverview,
  run(ctx) {
    const out: FindingDraft[] = [];
    // Optimized containers can set consent at container level, which we can't read yet.
    const containerLevelUnknown = ctx.model.state.state !== 'Legacy';
    for (const t of ctx.model.tags) {
      if (t.paused || t.consent.status !== 'NOT_SET') continue;
      const reason = marketingReason(t);
      if (!reason) continue;
      const gate = consentGate(t, ctx);
      const caveat = gate
        ? ` It does use the trigger "${gate}", which may be your consent platform's gate; check in Preview that it doesn't fire before consent.`
        : containerLevelUnknown
          ? ' This container may also control consent at container level; check in Preview.'
          : '';
      out.push({
        entity: tagEntity(t),
        message: `This tag (${reason}) has consent set to "Not set".${caveat}`,
        detailKey: 'NOT_SET',
        detail: { reason, gate },
        confidence: gate || containerLevelUnknown ? 'check-in-preview' : 'definite',
        where: WHERE.tags,
      });
    }
    return out;
  },
};
