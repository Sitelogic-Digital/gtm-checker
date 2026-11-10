import type { Tag } from '../../model';
import { ALL_STATES, tagEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';
import { analyticsClass, consentGateDetail } from './rsk-01-consent-not-set';

/**
 * The analytics counterpart of RSK-01 (added 2026-11-10, Peter): tools such as Microsoft Clarity, Hotjar
 * and Contentsquare have no built-in consent checks, and RSK-01/RSK-08 deliberately don't call them marketing.
 * Covers both consent "Not set" and "No additional consent required" (the latter is someone's decision, so
 * check-in-preview, like RSK-08). Warning, not Critical. Neutral wording: describe what the tag does, point to the policy owner.
 */
export const RSK_10: Rule = {
  id: 'RSK-10',
  title: 'Analytics or session-recording tag that doesn\'t wait for consent',
  area: 'consent',
  severity: 'warning',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'Tools like Microsoft Clarity, Hotjar and Contentsquare measure how visitors use the site, and some record whole sessions. Unlike Google\'s tags, they have no built-in consent checks. Unless something else blocks it, this tag runs whether or not the visitor has accepted analytics cookies. Whether that fits depends on the site\'s consent policy, which an export can\'t show.',
  fix: 'Check with whoever owns the site\'s consent policy how this tag should behave. To make it wait for consent, open the tag and go to Advanced Settings → Consent Settings → "Require additional consent for tag to fire", then add the consent types your policy calls for, such as analytics_storage. If it\'s meant to run without consent, choose "No additional consent required" and add a note to the tag recording the decision.',
  where: WHERE.consentOverview,
  run(ctx) {
    const out: FindingDraft[] = [];
    const containerLevelUnknown = ctx.model.state.state !== 'Legacy';
    for (const t of ctx.model.tags as Tag[]) {
      if (t.paused || (t.consent.status !== 'NOT_SET' && t.consent.status !== 'NOT_NEEDED')) continue;
      const chosen = t.consent.status === 'NOT_NEEDED';
      const cls = analyticsClass(t);
      if (!cls) continue;
      const g = consentGateDetail(t, ctx);
      const caveat = g?.blocking
        ? ` It has the blocking trigger "${g.name}", which looks like it stops the tag when consent is denied. Check in Preview that it also holds the tag back before the visitor has made a choice.`
        : g
          ? ` It does use the trigger "${g.name}", which may be your consent platform's gate; check in Preview that it doesn't run before consent.`
          : containerLevelUnknown
            ? ' This container may also control consent at container level; check in Preview.'
            : '';
      out.push({
        entity: tagEntity(t),
        message: chosen
          ? `This tag (${cls.reason}) is set to "No additional consent required".${g ? ` It uses the trigger "${g.name}", which may be a consent platform's gate.` : ''}`
          : `This tag (${cls.reason}) has consent set to "Not set".${caveat}`,
        detailKey: t.consent.status,
        detail: { reason: cls.reason, gate: g?.name },
        confidence: chosen || g || containerLevelUnknown || !cls.sure ? 'check-in-preview' : 'definite',
        where: WHERE.tags,
      });
    }
    return out;
  },
};
