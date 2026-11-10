/**
 * Health score per area. Deliberately simple so it can be explained in one
 * click and won't be argued with: start at 100, subtract a fixed number of
 * points per issue (not per finding, so 69 copies of one mistake cost the
 * same as one). Never below 0.
 */
import type { Area, AuditResult, Severity } from '../rules/types';

export const AREAS: Array<{ id: Area; label: string }> = [
  { id: 'ga4', label: 'GA4' },
  { id: 'ads', label: 'Ads' },
  { id: 'triggers', label: 'Triggers' },
  { id: 'consent', label: 'Consent' },
  { id: 'hygiene', label: 'Hygiene' },
];

/** Points per issue. "Check in Preview" issues cost half: we're less sure they're real. */
export const DEDUCTION: Record<Severity, number> = { critical: 30, warning: 10, housekeeping: 3, info: 0 };

export interface AreaScore {
  area: Area;
  label: string;
  score: number;
  deductions: Array<{ ruleId: string; title: string; severity: Severity; confidence: string; findings: number; points: number }>;
}

export function healthScores(result: AuditResult): AreaScore[] {
  return AREAS.map(({ id, label }) => {
    const deductions = result.issues
      .filter((i) => i.area === id)
      .map((i) => {
        const base = DEDUCTION[i.severity];
        const points = i.confidence === 'check-in-preview' ? Math.ceil(base / 2) : base;
        return { ruleId: i.ruleId, title: i.title, severity: i.severity, confidence: i.confidence, findings: i.findings.length, points };
      })
      .filter((d) => d.points > 0);
    const score = Math.max(0, 100 - deductions.reduce((s, d) => s + d.points, 0));
    return { area: id, label, score, deductions };
  });
}

export const SCORE_METHOD =
  'Each area starts at 100. Every issue takes off a fixed number of points: Critical 30, Warning 10, Housekeeping 3, halved (rounded up) when the issue needs checking in Preview. An issue counts once however many tags it affects. Scores never go below 0.';
