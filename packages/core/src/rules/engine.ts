import { extractGa4Events } from '../ga4';
import { buildGraph } from '../graph';
import type { ContainerModel } from '../model';
import type { AuditResult, Finding, IssueGroup, Rule, RuleContext, Severity } from './types';

export const SEVERITY_ORDER: Severity[] = ['critical', 'warning', 'housekeeping', 'info'];

/** Run rules against a parsed container. Deterministic: same input, same output, same order. */
export function runRules(model: ContainerModel, rules: readonly Rule[]): AuditResult {
  const graph = buildGraph(model);
  const ctx: RuleContext = { model, graph, events: extractGa4Events(model, graph) };
  const state = model.state.state;

  const findings: Finding[] = [];
  const rulesRun: string[] = [];
  const rulesSkipped: AuditResult['rulesSkipped'] = [];
  const ruleErrors: AuditResult['ruleErrors'] = [];

  for (const rule of rules) {
    if (!rule.appliesTo.includes(state)) {
      rulesSkipped.push({ id: rule.id, reason: `Only applies to ${rule.appliesTo.join(' or ')} containers; this one is ${state}.` });
      continue;
    }
    rulesRun.push(rule.id);
    let drafts;
    try {
      drafts = rule.run(ctx);
    } catch (err) {
      ruleErrors.push({ id: rule.id, message: err instanceof Error ? err.message : String(err) });
      continue;
    }
    const seen = new Set<string>();
    for (const d of drafts) {
      const fingerprint = fingerprintOf(rule.id, `${d.entity.kind}:${d.entity.id}`, d.detailKey);
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      findings.push({
        ruleId: rule.id,
        ruleTitle: rule.title,
        area: rule.area,
        severity: d.severity ?? rule.severity,
        confidence: d.confidence ?? rule.confidence,
        entity: d.entity,
        related: d.related ?? [],
        message: d.message,
        why: d.why ?? rule.why,
        fix: d.fix ?? rule.fix,
        where: d.where ?? rule.where,
        detail: d.detail ?? {},
        detailKey: d.detailKey,
        fingerprint,
      });
    }
  }

  findings.sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
      a.ruleId.localeCompare(b.ruleId) ||
      a.entity.name.localeCompare(b.entity.name),
  );

  const groups = new Map<string, IssueGroup>();
  for (const f of findings) {
    const key = `${f.ruleId}|${f.severity}`;
    let g = groups.get(key);
    if (!g) {
      g = { ruleId: f.ruleId, title: f.ruleTitle, area: f.area, severity: f.severity, confidence: f.confidence, findings: [] };
      groups.set(key, g);
    }
    g.findings.push(f);
    // A group is only "definite" if every finding in it is.
    if (f.confidence === 'check-in-preview') g.confidence = 'check-in-preview';
  }
  const issues = [...groups.values()];

  const counts = Object.fromEntries(
    SEVERITY_ORDER.map((s) => [
      s,
      { issues: issues.filter((i) => i.severity === s).length, findings: findings.filter((f) => f.severity === s).length },
    ]),
  ) as AuditResult['counts'];

  return { state, findings, issues, counts, rulesRun, rulesSkipped, ruleErrors };
}

/** cyrb53: small, fast, deterministic, no dependencies. Not cryptographic; it only needs to be stable. */
export function fingerprintOf(...parts: string[]): string {
  const str = parts.join('␟');
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}
