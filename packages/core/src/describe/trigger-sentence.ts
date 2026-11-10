/**
 * Triggers as plain English:
 * "Fires on every link click where Click URL contains /thank-you, except where Page Path equals /admin."
 */
import type { EntityGraph } from '../graph';
import type { Condition, Trigger } from '../model';
import { paramString } from '../params';

const OPERATOR: Record<string, string> = {
  EQUALS: 'equals',
  CONTAINS: 'contains',
  STARTS_WITH: 'starts with',
  ENDS_WITH: 'ends with',
  MATCH_REGEX: 'matches the regex',
  CSS_SELECTOR: 'matches the CSS selector',
  GREATER: 'is greater than',
  GREATER_OR_EQUALS: 'is at least',
  LESS: 'is less than',
  LESS_OR_EQUALS: 'is at most',
};

/** "{{Page Path}}" → "Page Path"; anything else is shown as written. */
export const varLabel = (s: string) => s.replace(/^\s*\{\{([^{}]+)\}\}\s*$/, '$1');

export function conditionPhrase(c: Condition): string {
  const op = OPERATOR[c.operator] ?? c.operator.toLowerCase().replace(/_/g, ' ');
  const right = c.right === '' ? '(empty)' : c.right;
  return `${varLabel(c.left)} ${op} ${right}${c.ignoreCase ? ' (ignoring case)' : ''}`;
}

/** Positive conditions joined with "and", negated ones as "except where". */
export function conditionsClause(conds: Condition[]): string {
  const pos = conds.filter((c) => !c.negate).map(conditionPhrase);
  const neg = conds.filter((c) => c.negate).map(conditionPhrase);
  let out = '';
  if (pos.length) out += ` where ${pos.join(' and ')}`;
  if (neg.length) out += `${out ? ',' : ''} except where ${neg.join(' or ')}`;
  return out;
}

function customEventName(t: Trigger): { text: string; rest: Condition[] } {
  const ev = t.customEventFilters.find((c) => c.left === '{{_event}}' && !c.negate);
  const rest = t.customEventFilters.filter((c) => c !== ev);
  if (!ev) return { text: 'any data layer event', rest };
  if (ev.operator === 'EQUALS') return { text: `the data layer event "${ev.right}"`, rest };
  return { text: `any data layer event whose name ${OPERATOR[ev.operator] ?? ev.operator} ${ev.right}`, rest };
}

export function triggerSentence(t: Trigger, graph?: EntityGraph): string {
  const p = t.params;
  const filters = t.filters;
  let lead: string;
  let extra: Condition[] = [];

  switch (t.type.key) {
    case 'PAGEVIEW':
      lead = t.builtIn ? 'Fires on every page view' : 'Fires on page view';
      break;
    case 'DOM_READY':
      lead = 'Fires when the page\'s HTML has loaded (DOM Ready)';
      break;
    case 'WINDOW_LOADED':
      lead = 'Fires when the page and everything on it has finished loading (Window Loaded)';
      break;
    case 'INIT':
      lead = 'Fires at Initialization, before any page view trigger';
      break;
    case 'CONSENT_INIT':
      lead = 'Fires at Consent Initialization, before everything else';
      break;
    case 'CUSTOM_EVENT': {
      const ev = customEventName(t);
      lead = `Fires when the site pushes ${ev.text}`;
      extra = ev.rest;
      break;
    }
    case 'CLICK':
      lead = filters.length ? 'Fires on clicks on any element' : 'Fires on every click on any element';
      break;
    case 'LINK_CLICK':
      lead = filters.length ? 'Fires on link clicks' : 'Fires on every link click';
      break;
    case 'FORM_SUBMISSION':
      lead = filters.length ? 'Fires on form submissions' : 'Fires on every form submission';
      break;
    case 'HISTORY_CHANGE':
      lead = 'Fires on in-page navigation (History Change)';
      break;
    case 'TIMER': {
      const ms = paramString(p, 'interval') ?? (typeof t.extra.interval === 'object' ? String((t.extra.interval as { value?: string }).value ?? '') : '');
      lead = ms ? `Fires every ${Number(ms) / 1000} seconds` : 'Fires on a timer';
      break;
    }
    case 'SCROLL_DEPTH': {
      const raw = t.extra.verticalScrollPercentageList as { value?: string } | undefined;
      lead = raw?.value ? `Fires when the visitor scrolls ${raw.value}% down the page` : 'Fires at scroll depth thresholds';
      break;
    }
    case 'ELEMENT_VISIBILITY':
      lead = 'Fires when a specific element scrolls into view';
      break;
    case 'YOU_TUBE_VIDEO':
      lead = 'Fires on embedded YouTube video events';
      break;
    case 'JS_ERROR':
      lead = 'Fires when a JavaScript error occurs';
      break;
    case 'TRIGGER_GROUP': {
      const names = t.groupTriggerIds.map((id) => graph?.triggersById.get(id)?.name ?? `trigger ${id}`);
      lead = `Fires once all of these have fired: ${names.map((n) => `"${n}"`).join(', ')}`;
      break;
    }
    default:
      lead = `Fires on ${t.type.label === 'Not recognised yet' ? `a trigger type we don't recognise yet (${t.type.key})` : t.type.label}`;
  }

  if (t.builtIn && t.type.key === 'INIT') lead = 'Fires at Initialization on every page, before any page view trigger';
  if (t.builtIn && t.type.key === 'CONSENT_INIT') lead = 'Fires at Consent Initialization on every page, before everything else';

  const clause = conditionsClause([...filters, ...extra]);
  const notes: string[] = [];
  if (t.type.key === 'FORM_SUBMISSION' && t.checkValidation !== true) notes.push('Check Validation is off, so it also fires on submissions the form rejects.');
  if ((t.type.key === 'LINK_CLICK' || t.type.key === 'FORM_SUBMISSION') && t.waitForTags === true) notes.push('It holds navigation briefly so tags can finish.');
  return `${lead}${clause}.${notes.length ? ` ${notes.join(' ')}` : ''}`;
}
