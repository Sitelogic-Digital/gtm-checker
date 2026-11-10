import type { Ga4Send } from '../ga4';
import type { ContainerState, Tag, Trigger } from '../model';
import type { FindingEntity, FixLocation } from './types';

export const ALL_STATES: readonly ContainerState[] = ['Legacy', 'Optimized', 'Mixed'];

export const WHERE = {
  tags: { path: 'Tags', legacyPath: 'Tags' },
  triggers: { path: 'Advanced → Triggers', legacyPath: 'Triggers' },
  variables: { path: 'Advanced → Variables', legacyPath: 'Variables' },
  builtInVariables: { path: 'Advanced → Variables → Built-In Variables → Configure', legacyPath: 'Variables → Built-In Variables → Configure' },
  templates: { path: 'Advanced → Templates', legacyPath: 'Templates' },
  consentOverview: { path: 'Tags → Consent overview (shield icon)', legacyPath: 'Tags → Consent overview (shield icon)' },
} satisfies Record<string, FixLocation>;

export const tagEntity = (t: Pick<Tag, 'id' | 'name'>): FindingEntity => ({ kind: 'tag', id: t.id, name: t.name });
export const triggerEntity = (t: Pick<Trigger, 'id' | 'name'>): FindingEntity => ({ kind: 'trigger', id: t.id, name: t.name });
export const sendEntity = (s: Ga4Send): FindingEntity => ({ kind: 'tag', id: s.tagId, name: s.tagName });

/** Lowercase, strip separators. "form_Name", "formName", "form-name" → "formname". */
export const normaliseName = (s: string) => s.toLowerCase().replace(/[\s_\-.]/g, '');

export const isDynamic = (s: string) => s.includes('{{');

/** Sends that will actually fire: paused tags send nothing. */
export function activeSends(events: { sends: Ga4Send[] }[]): Ga4Send[] {
  return events.flatMap((e) => e.sends).filter((s) => !s.paused);
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const list = (items: string[], max = 5) => {
  const shown = items.slice(0, max).map((x) => `"${x}"`);
  const rest = items.length - shown.length;
  return rest > 0 ? `${shown.join(', ')} and ${rest} more` : shown.join(', ');
};

/**
 * Tag types with Built-In Consent Checks: they follow Consent Mode without extra settings,
 * so consent "Not set" isn't a gap. Add a type only with evidence from the GTM UI
 * (Advanced Settings → Consent Settings → Built-In Consent Checks).
 *   baut (Microsoft UET): ad_storage, ad_personalization, ad_user_data. Confirmed 2026-11-09 in the GTM UI on a client container.
 */
export const BUILT_IN_CONSENT = new Set(['googtag', 'gaawe', 'gaawc', 'awct', 'sp', 'awud', 'awcc', 'gclidw', 'flc', 'fls', 'baut']);

/** Page-load trigger types. INIT and CONSENT_INIT fire before page view, on every page. */
export const PAGE_LOAD_TRIGGERS = new Set(['PAGEVIEW', 'DOM_READY', 'WINDOW_LOADED', 'INIT', 'CONSENT_INIT']);

/** Trigger names or custom events that look like a consent platform's gate or update event. */
export const CONSENT_TRIGGER = /consent|cookie|gdpr|ccpa|cmp|onetrust|cookiebot|usercentrics|optanon|marketing.?allowed|ad.?storage/i;

/** True when a trigger's name or custom event name looks like a consent platform's gate or update. */
export function isConsentTrigger(trg: { name: string; customEventFilters: Array<{ right: string }> }): boolean {
  return CONSENT_TRIGGER.test(trg.name) || trg.customEventFilters.some((c) => CONSENT_TRIGGER.test(c.right));
}
