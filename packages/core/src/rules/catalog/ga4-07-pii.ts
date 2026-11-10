import type { Ga4Param } from '../../ga4';
import { activeSends, ALL_STATES, isDynamic, normaliseName, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

/** Normalised names that are PII on their own. */
const EXACT = new Set(['email', 'mail', 'phone', 'tel', 'mobile', 'name', 'username', 'address', 'zip', 'dob', 'ssn']);
/** Normalised substrings that indicate PII anywhere in the name. */
const CONTAINS = [
  'email', 'phone', 'telephone', 'mobilenumber', 'firstname', 'lastname', 'fullname', 'surname',
  'streetaddress', 'homeaddress', 'postcode', 'postalcode', 'zipcode', 'dateofbirth', 'birthdate', 'passport',
];
/** Hashed values, yes/no flags (has_email, isPhoneVerified) and metadata about the field, not its contents. */
const SAFE = /hash|sha256|md5|encrypted|domain|opt_?in|consent|verified|exists|present|provided|^(has|is)([_A-Z]|$)/i;

function looksLikePii(s: string | undefined): boolean {
  if (!s || SAFE.test(s)) return false;
  const n = normaliseName(s);
  return EXACT.has(n) || CONTAINS.some((c) => n.includes(c));
}

/** Which part of the parameter looks personal: its name, the variable feeding it, or the data layer key. */
function evidence(p: Ga4Param): string | undefined {
  if (looksLikePii(p.name)) return `the name "${p.name}"`;
  if (looksLikePii(p.source.detail)) return `its value, which comes from the data layer key "${p.source.detail}"`;
  if (looksLikePii(p.source.variableName)) return `its value, which comes from the variable {{${p.source.variableName}}}`;
  return undefined;
}

export const GA4_07: Rule = {
  id: 'GA4-07',
  title: 'Parameter that looks like personal data',
  area: 'ga4',
  severity: 'critical',
  confidence: 'check-in-preview',
  appliesTo: ALL_STATES,
  why: 'Google\'s terms for Analytics don\'t allow personally identifiable information to be sent to GA4, and Google can require affected data to be deleted.',
  fix: 'Check in Preview what this actually sends. If it\'s personal data, remove it or send a yes/no flag (such as has_email) instead. Whether hashed values are acceptable is a question for whoever owns the site\'s privacy policy.',
  where: WHERE.tags,
  run({ events }) {
    const out: FindingDraft[] = [];
    for (const s of activeSends(events)) {
      for (const [list, label] of [[s.params, 'parameter'], [s.userProperties, 'user property']] as const) {
        for (const p of list) {
          if (isDynamic(p.name)) continue;
          const why = evidence(p);
          if (!why) continue;
          out.push({
            entity: { kind: p.definedIn.kind, id: p.definedIn.id, name: p.definedIn.name },
            message: `The ${label} "${p.name}" may carry personal data, judging by ${why}.`,
            detailKey: `${label}:${p.name}`,
            detail: { name: p.name, source: p.source, eventName: s.eventName },
            where: p.definedIn.kind === 'variable' ? WHERE.variables : WHERE.tags,
          });
        }
      }
    }
    return out;
  },
};
