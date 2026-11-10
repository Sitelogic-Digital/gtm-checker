import type { Condition } from '../../model';
import { ALL_STATES, isDynamic, triggerEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

const MATCHES_EVERYTHING = /^\^?(\.\*|\.\+|\(\.\*\))?\$?$/;

export function regexProblem(c: Condition): string | undefined {
  if (c.operator !== 'MATCH_REGEX' || isDynamic(c.right)) return undefined;
  const pattern = c.right;
  // Web containers evaluate trigger regex in the browser, so JavaScript syntax (including lookaheads) is the test.
  try {
    new RegExp(pattern, c.ignoreCase ? 'i' : '');
  } catch {
    return `has a regex that won't compile ("${pattern}")`;
  }
  if (MATCHES_EVERYTHING.test(pattern)) {
    return c.negate
      ? `says "${c.left} does not match ${pattern || '(empty)'}", which is never true, so this trigger never fires`
      : `matches ${c.left} against "${pattern || '(empty)'}", which matches everything, so the condition does nothing`;
  }
  return undefined;
}

export const TRG_02: Rule = {
  id: 'TRG-02',
  title: 'Broken or meaningless regex in a trigger',
  area: 'triggers',
  severity: 'critical',
  confidence: 'definite',
  appliesTo: ALL_STATES,
  why: 'A regex that GTM can\'t run means the trigger never fires, and one that matches everything means it fires far more often than intended. Either way the tags behind it send the wrong data.',
  fix: 'Fix the pattern, or replace it with a simpler condition (equals, contains, starts with) if you don\'t need a regex. Test it in Preview on a page that should match and one that shouldn\'t.',
  where: WHERE.triggers,
  run({ model }) {
    const out: FindingDraft[] = [];
    for (const t of model.triggers) {
      const lists = [
        ['filter', t.filters],
        ['customEventFilter', t.customEventFilters],
        ['autoEventFilter', t.autoEventFilters],
      ] as const;
      for (const [label, conds] of lists) {
        conds.forEach((c, i) => {
          const problem = regexProblem(c);
          if (problem) {
            out.push({
              entity: triggerEntity(t),
              message: `This trigger ${problem}.`,
              detailKey: `${label}[${i}]:${c.right}`,
              detail: { condition: c },
            });
          }
        });
      }
    }
    return out;
  },
};
