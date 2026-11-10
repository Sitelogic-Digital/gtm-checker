import { lookupDomain } from '../../config/known-domains';
import type { Tag } from '../../model';
import { paramString } from '../../params';
import { ALL_STATES, BUILT_IN_CONSENT, tagEntity, WHERE, isConsentTrigger } from '../helpers';
import type { FindingDraft, Rule, RuleContext } from '../types';
import { scriptSources } from './rsk-04-custom-html';

const MARKETING_TYPES = new Set(['bzi', 'pntr', 'img']);
const CMP_TEMPLATE = /consent|cookie|cmp|onetrust|cookiebot|usercentrics|termly|iubenda|complianz|didomi|osano|cookieyes|quantcast choice/i;
const PIXEL_CODE = /\b(fbq|lintrk|_linkedin_partner_id|ttq|snaptr|uetq|twq|pintrk|obApi|rdt|_tfa|adroll_adv_id|saq\s*\(|gtag\s*\(\s*['"]config['"]\s*,\s*['"]AW-)/;

/** Analytics, session-recording and testing tools: they need consent decisions too, but they aren't advertising or marketing. */
const ANALYTICS_TEMPLATE = /clarity|hotjar|contentsquare|fullstory|mouseflow|heap|mixpanel|amplitude|segment|matomo|piwik|smartlook|crazy ?egg|lucky ?orange|vwo|optimizely|ab ?tasty|google analytics/i;
/** Template names we know are advertising or marketing vendors. */
const MARKETING_TEMPLATE = /facebook|meta pixel|linkedin|insight ?tag|tiktok|pinterest|twitter|\bx pixel|reddit|snap|criteo|adroll|outbrain|taboola|quora|stackadapt|trade ?desk|bing|microsoft ads|amazon ads|spotify|braze|hubspot|marketo|pardot|act-on|klaviyo/i;
/** Template permissions that let a tag load or send anything on its own. Without one, it can only call code another tag loaded. */
const LOADS_OR_SENDS = ['inject_script', 'send_pixel', 'set_cookies', 'inject_hidden_iframe'];

/**
 * Why we think this tag is advertising or marketing, and how sure we are; undefined if we don't think so.
 * Template tags are judged by their declared permissions first (2026-11-10): a template that can't load
 * scripts, send pixels or set cookies (such as Braze's 52 "Actions" tags, which only call the SDK the
 * Initialization tag loads) is never counted; the tag that loads the code is the decision that matters.
 */
export function marketingClass(t: Tag): { reason: string; sure: boolean } | undefined {
  if (BUILT_IN_CONSENT.has(t.type.key)) return undefined;
  if (MARKETING_TYPES.has(t.type.key)) return { reason: t.type.label, sure: true };
  const tpl = t.type.template;
  if (tpl) {
    if (CMP_TEMPLATE.test(tpl.name)) return undefined;
    if (!tpl.permissions.some((p) => LOADS_OR_SENDS.includes(p))) return undefined;
    if (ANALYTICS_TEMPLATE.test(tpl.name)) return undefined;
    if (MARKETING_TEMPLATE.test(tpl.name)) return { reason: tpl.name, sure: true };
    return { reason: `${tpl.name}, a template that loads third-party code`, sure: false };
  }
  if (t.type.key === 'html') {
    const html = paramString(t.params, 'html') ?? '';
    const vendor = scriptSources(html).map((u) => lookupDomain(u.host)).find((d) => d?.marketing);
    if (vendor) return { reason: `Custom HTML loading ${vendor.vendor}`, sure: true };
    if (PIXEL_CODE.test(html)) return { reason: 'Custom HTML containing an advertising pixel', sure: true };
  }
  return undefined;
}

/** Session-recording and analytics snippets in Custom HTML, for when the script address isn't a plain src attribute. */
const ANALYTICS_CODE = /\b(_hjSettings|hotjar|clarity\s*\(|clarity\.ms|_uxa|contentsquare|_fs_org|mouseflow|heap\.load|mixpanel\.init|amplitude\.(init|getInstance)|analytics\.load\s*\(|_paq\.push|smartlook\s*\()/i;
/** GTM's own tag types for analytics tools without built-in consent checks (hjtc = Hotjar). */
const ANALYTICS_TYPES = new Set(['hjtc']);

/**
 * Why we think this tag is an analytics or session-recording tool without Google's built-in consent checks,
 * or undefined. Never true for a tag marketingClass already claims, so a tag is reported by one rule only.
 */
export function analyticsClass(t: Tag): { reason: string; sure: boolean } | undefined {
  if (BUILT_IN_CONSENT.has(t.type.key) || marketingClass(t)) return undefined;
  if (ANALYTICS_TYPES.has(t.type.key)) return { reason: t.type.label, sure: true };
  const tpl = t.type.template;
  if (tpl) {
    if (CMP_TEMPLATE.test(tpl.name)) return undefined;
    if (!tpl.permissions.some((p) => LOADS_OR_SENDS.includes(p))) return undefined;
    return ANALYTICS_TEMPLATE.test(tpl.name) ? { reason: tpl.name, sure: true } : undefined;
  }
  if (t.type.key === 'html') {
    const html = paramString(t.params, 'html') ?? '';
    const vendor = scriptSources(html).map((u) => lookupDomain(u.host)).find((d) => d?.analytics);
    if (vendor) return { reason: `Custom HTML loading ${vendor.vendor}`, sure: true };
    if (ANALYTICS_CODE.test(html)) return { reason: 'Custom HTML containing an analytics or session-recording snippet', sure: true };
  }
  return undefined;
}

/** Why we think this tag is advertising or marketing, or undefined if we don't. */
export function marketingReason(t: Tag): string | undefined {
  return marketingClass(t)?.reason;
}

/** Firing or blocking triggers that look like a consent platform's gate. */
export function consentGate(t: Tag, ctx: RuleContext): string | undefined {
  return consentGateDetail(t, ctx)?.name;
}

/** Like consentGate, but says whether the gate is a blocking (exception) trigger. Blocking gates are checked first. */
export function consentGateDetail(t: Tag, ctx: RuleContext): { name: string; blocking: boolean } | undefined {
  for (const [ids, blocking] of [[t.blockingTriggerIds, true], [t.firingTriggerIds, false]] as const) {
    for (const id of ids) {
      const trg = ctx.graph.triggersById.get(id);
      if (trg && isConsentTrigger(trg)) return { name: trg.name, blocking };
    }
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
      const cls = marketingClass(t);
      if (!cls) continue;
      const reason = cls.reason;
      const g = consentGateDetail(t, ctx);
      const gate = g?.name;
      // A consent-looking blocking (exception) trigger is a real, if older, way of holding a tag back: a Warning, not Critical.
      const caveat = g?.blocking
        ? ` It has the blocking trigger "${gate}", which looks like it stops the tag when consent is denied. Check in Preview that it also holds the tag back before the visitor has made a choice, when the consent value is often empty rather than "denied".`
        : gate
        ? ` It does use the trigger "${gate}", which may be your consent platform's gate; check in Preview that it doesn't fire before consent.`
        : containerLevelUnknown
          ? ' This container may also control consent at container level; check in Preview.'
          : '';
      out.push({
        entity: tagEntity(t),
        message: `This tag (${reason}) has consent set to "Not set".${caveat}`,
        detailKey: 'NOT_SET',
        detail: { reason, gate, gateIsBlocking: g?.blocking ?? false },
        confidence: gate || containerLevelUnknown || !cls.sure ? 'check-in-preview' : 'definite',
        ...(g?.blocking ? { severity: 'warning' as const } : {}),
        where: WHERE.tags,
      });
    }
    return out;
  },
};
