import type { Tag } from '../../model';
import { ALL_STATES, tagEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';
import { consentGate, marketingReason } from './rsk-01-consent-not-set';

/**
 * Marketing tags explicitly set to "No additional consent required".
 * Someone chose this, so it isn't an oversight like RSK-01. We describe what
 * the setting does and point to the policy owner. We never say whether it's
 * allowed: that depends on jurisdiction and the site's policy, not the export.
 */
export const RSK_08: Rule = {
  id: 'RSK-08',
  title: 'Marketing tag set to fire without consent',
  area: 'consent',
  severity: 'warning',
  confidence: 'check-in-preview',
  appliesTo: ALL_STATES,
  why: 'This tag has no built-in consent checks and is set to "No additional consent required", so it fires whether or not the visitor has accepted marketing cookies. Whether that fits depends on where the site\'s visitors are and what its consent policy says, which an export can\'t show. GTM doesn\'t flag the setting, so it\'s easy to lose track of which tags use it and why.',
  fix: 'Confirm with whoever owns the site\'s consent policy that this tag should fire without consent in every region the site serves. If it shouldn\'t, change Advanced Settings → Consent Settings to "Require additional consent for tag to fire" and add the consent types the policy calls for. Either way, a note on the tag recording the decision helps the next person.',
  where: WHERE.consentOverview,
  run(ctx) {
    const out: FindingDraft[] = [];
    for (const t of ctx.model.tags as Tag[]) {
      if (t.paused || t.consent.status !== 'NOT_NEEDED') continue;
      const reason = marketingReason(t);
      if (!reason) continue;
      const gate = consentGate(t, ctx);
      out.push({
        entity: tagEntity(t),
        message: `This tag (${reason}) is set to "No additional consent required".${gate ? ` It uses the trigger "${gate}", which may be a consent platform's gate.` : ''}`,
        detailKey: 'NOT_NEEDED',
        detail: { reason, gate },
        where: WHERE.tags,
      });
    }
    return out;
  },
};
