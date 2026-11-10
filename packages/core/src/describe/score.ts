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
  /** null when the container has nothing in this area to judge (no GA4 tags, no Google Ads tags): a 100 would mislead. */
  score: number | null;
  deductions: Array<{ ruleId: string; title: string; severity: Severity; confidence: string; findings: number; points: number }>;
}

/** Tag types that mean an area is in use. Areas not listed (triggers, consent, hygiene) always apply. */
const AREA_TAG_TYPES: Partial<Record<Area, readonly string[]>> = {
  ga4: ['gaawe', 'googtag'],
  ads: ['awct', 'sp', 'gclidw', 'awud', 'flc', 'fls'],
};

/** Areas the container has nothing in, from its tag types. Pass the result to healthScores. */
export function unusedAreas(tagTypes: Iterable<string>): Area[] {
  const types = new Set(tagTypes);
  return (Object.entries(AREA_TAG_TYPES) as Array<[Area, readonly string[]]>).filter(([, keys]) => !keys.some((k) => types.has(k))).map(([a]) => a);
}

export function healthScores(result: AuditResult, unused: readonly Area[] = []): AreaScore[] {
  return AREAS.map(({ id, label }) => {
    const deductions = result.issues
      .filter((i) => i.area === id)
      .map((i) => {
        const base = DEDUCTION[i.severity];
        const points = i.confidence === 'check-in-preview' ? Math.ceil(base / 2) : base;
        return { ruleId: i.ruleId, title: i.title, severity: i.severity, confidence: i.confidence, findings: i.findings.length, points };
      })
      .filter((d) => d.points > 0);
    const score = unused.includes(id) && !deductions.length ? null : Math.max(0, 100 - deductions.reduce((s, d) => s + d.points, 0));
    return { area: id, label, score, deductions };
  });
}

export const SCORE_METHOD =
  'Each area starts at 100. Every issue takes off a fixed number of points: Critical 30, Warning 10, Housekeeping 3, halved (rounded up) when the issue needs checking in Preview. An issue counts once however many tags it affects. Scores never go below 0.';
