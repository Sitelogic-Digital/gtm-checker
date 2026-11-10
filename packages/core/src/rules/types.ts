import type { Ga4Event } from '../ga4';
import type { EntityGraph } from '../graph';
import type { ContainerModel, ContainerState } from '../model';

/** Critical breaks data or creates legal exposure; Warning is probably wrong; Housekeeping is mess; Info is context. */
export type Severity = 'critical' | 'warning' | 'housekeeping' | 'info';
/** Definite: provable from the JSON. Check in Preview: likely, but depends on the site. */
export type Confidence = 'definite' | 'check-in-preview';
export type Area = 'ga4' | 'ads' | 'triggers' | 'consent' | 'hygiene';

export type FindingEntityKind =
  | 'tag'
  | 'trigger'
  | 'variable'
  | 'template'
  | 'event'
  | 'parameter'
  | 'custom-event'
  | 'measurement-id'
  | 'container';

export interface FindingEntity {
  kind: FindingEntityKind;
  /** GTM ID for tags/triggers/variables/templates; the name itself for events and parameters. */
  id: string;
  name: string;
}

/** Where to fix it, in the 2026 GTM navigation with the pre-2026 path as fallback. */
export interface FixLocation {
  path: string;
  legacyPath: string;
}

export interface Finding {
  ruleId: string;
  ruleTitle: string;
  area: Area;
  severity: Severity;
  confidence: Confidence;
  entity: FindingEntity;
  related: FindingEntity[];
  /** What's wrong, specific to this entity. Second person, plain. */
  message: string;
  /** Why it matters. */
  why: string;
  /** How to fix it. */
  fix: string;
  where: FixLocation;
  detail: Record<string, unknown>;
  /** The part of the problem that identifies it across uploads (feeds the fingerprint). */
  detailKey: string;
  /** Stable across uploads: hash of rule ID, entity ID and the triggering detail. */
  fingerprint: string;
}

/** What a rule returns; the engine fills in the rule's defaults. */
export interface FindingDraft {
  entity: FindingEntity;
  message: string;
  /** The part of the problem that identifies it across uploads, e.g. the bad parameter name. */
  detailKey: string;
  related?: FindingEntity[];
  detail?: Record<string, unknown>;
  severity?: Severity;
  confidence?: Confidence;
  why?: string;
  fix?: string;
  where?: FixLocation;
}

export interface RuleContext {
  model: ContainerModel;
  graph: EntityGraph;
  events: Ga4Event[];
}

export interface Rule {
  id: string;
  title: string;
  area: Area;
  severity: Severity;
  confidence: Confidence;
  /** Container states this rule is valid for. RSK-02 and RSK-03 give opposite advice; this is why. */
  appliesTo: readonly ContainerState[];
  why: string;
  fix: string;
  where: FixLocation;
  run(ctx: RuleContext): FindingDraft[];
}

export interface IssueGroup {
  ruleId: string;
  title: string;
  area: Area;
  severity: Severity;
  confidence: Confidence;
  findings: Finding[];
}

export interface AuditResult {
  state: ContainerState;
  findings: Finding[];
  /** Findings grouped by rule and severity: what the report counts and lists. */
  issues: IssueGroup[];
  counts: Record<Severity, { issues: number; findings: number }>;
  rulesRun: string[];
  rulesSkipped: Array<{ id: string; reason: string }>;
  /** A rule that threw. The audit continues; these need fixing in code. */
  ruleErrors: Array<{ id: string; message: string }>;
}
