import { GA4_01 } from './catalog/ga4-01-event-name';
import { GA4_02 } from './catalog/ga4-02-param-count';
import { GA4_03 } from './catalog/ga4-03-param-name';
import { GA4_04 } from './catalog/ga4-04-reserved-event';
import { GA4_05 } from './catalog/ga4-05-ecommerce';
import { GA4_07 } from './catalog/ga4-07-pii';
import { GA4_08 } from './catalog/ga4-08-inconsistent-params';
import { GA4_09 } from './catalog/ga4-09-near-duplicate-params';
import { GA4_10 } from './catalog/ga4-10-recommended-event';
import { GA4_11 } from './catalog/ga4-11-hardcoded-measurement-id';
import { RSK_01 } from './catalog/rsk-01-consent-not-set';
import { RSK_02 } from './catalog/rsk-02-missing-conversion-linker';
import { RSK_03 } from './catalog/rsk-03-linker-after-optimization';
import { RSK_04 } from './catalog/rsk-04-custom-html';
import { RSK_05 } from './catalog/rsk-05-template-permissions';
import { RSK_06 } from './catalog/rsk-06-universal-analytics';
import { RSK_07 } from './catalog/rsk-07-missing-variable';
import { RSK_08 } from './catalog/rsk-08-consent-not-needed';
import { TRG_01 } from './catalog/trg-01-page-view-double';
import { TRG_02 } from './catalog/trg-02-regex';
import { TRG_03 } from './catalog/trg-03-unfiltered-click';
import { TRG_04 } from './catalog/trg-04-custom-event-casing';
import { TRG_05 } from './catalog/trg-05-form-validation';
import { TRG_06 } from './catalog/trg-06-unused-trigger';
import { RSK_09 } from './catalog/rsk-09-unused-template';
import { RSK_10 } from './catalog/rsk-10-analytics-consent';
import { runRules } from './engine';
import type { AuditResult, Rule } from './types';
import type { ContainerModel } from '../model';

/**
 * The v1 starter catalog. GA4-06 (legacy Google tag plus GA4 destination tag
 * on the same ID) is missing on purpose: it needs the destination tag type
 * keys, which we don't have yet.
 */
export const STARTER_RULES: readonly Rule[] = [
  GA4_01, GA4_02, GA4_03, GA4_04, GA4_05, GA4_07, GA4_08, GA4_09, GA4_10, GA4_11,
  TRG_01, TRG_02, TRG_03, TRG_04, TRG_05, TRG_06,
  RSK_01, RSK_02, RSK_03, RSK_04, RSK_05, RSK_06, RSK_07, RSK_08, RSK_09, RSK_10,
];

export function audit(model: ContainerModel, rules: readonly Rule[] = STARTER_RULES): AuditResult {
  return runRules(model, rules);
}

export { runRules, fingerprintOf, SEVERITY_ORDER } from './engine';
export type * from './types';
