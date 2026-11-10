import { describe, expect, it } from 'vitest';
import { audit, parseContainer, STARTER_RULES, type Rule } from '../src';
import { ALL_STATES } from '../src/rules/helpers';
import { container, ga4Event, tag } from './builders';

const parse = (raw: ReturnType<typeof container>) => {
  const p = parseContainer(raw);
  if (!p.ok) throw new Error(p.error.message);
  return p.model;
};

describe('rule engine', () => {
  it('gives every starter rule a unique ID, a why, a fix and a fix location', () => {
    const ids = STARTER_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of STARTER_RULES) {
      expect(r.why.length, r.id).toBeGreaterThan(20);
      expect(r.fix.length, r.id).toBeGreaterThan(20);
      expect(r.where.path, r.id).toBeTruthy();
      expect(r.where.legacyPath, r.id).toBeTruthy();
    }
  });

  it('keeps fingerprints stable when a tag is renamed (they key on GTM ID, not name)', () => {
    const before = audit(parse(container({ tags: [tag('ua', { id: '5', name: 'Old name' })] })));
    const after = audit(parse(container({ tags: [tag('ua', { id: '5', name: 'New name' })] })));
    expect(before.findings[0]!.fingerprint).toBe(after.findings[0]!.fingerprint);
  });

  it('gives the same output twice', () => {
    const raw = container({ tags: [ga4Event('lead_submit', { formName: 'a' }), ga4Event('x', { form_name: 'b' }), tag('img', { consent: 'NOT_SET' })] });
    expect(audit(parse(raw))).toEqual(audit(parse(raw)));
  });

  it('groups findings into issues and counts both', () => {
    const r = audit(parse(container({ tags: [tag('img', { consent: 'NOT_SET' }), tag('img', { consent: 'NOT_SET' })] })));
    const consent = r.issues.find((i) => i.ruleId === 'RSK-01')!;
    expect(consent.findings).toHaveLength(2);
    expect(r.counts.critical).toEqual({ issues: 1, findings: 2 });
  });

  it('isolates a rule that throws and keeps going', () => {
    const broken: Rule = { ...STARTER_RULES[0]!, id: 'BROKEN', run: () => { throw new Error('boom'); } };
    const r = audit(parse(container({ tags: [tag('ua')] })), [broken, ...STARTER_RULES]);
    expect(r.ruleErrors).toEqual([{ id: 'BROKEN', message: 'boom' }]);
    expect(r.findings.some((f) => f.ruleId === 'RSK-06')).toBe(true);
  });

  it('skips rules that do not apply to the container state, and says why', () => {
    const r = audit(parse(container({})));
    expect(r.rulesSkipped.map((s) => s.id)).toEqual(['RSK-03']);
    expect(r.rulesRun.length).toBe(STARTER_RULES.length - 1);
    expect(ALL_STATES).toContain(r.state);
  });
});

describe('copy', () => {
  it('no rule gives legal advice or a legal verdict', () => {
    const legal = /\b(illegal|unlawful|legal problem|breach|violat|non-?complian|you must comply|GDPR requires|against the law)\b/i;
    for (const r of STARTER_RULES) expect(`${r.why} ${r.fix}`, r.id).not.toMatch(legal);
  });
});
