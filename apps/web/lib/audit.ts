import {
  audit,
  buildGraph,
  extractGa4Events,
  healthScores,
  overviewSentences,
  parseContainer,
  type AreaScore,
  type AuditResult,
  type ContainerModel,
  type EntityGraph,
  type Finding,
  type Ga4Event,
  type ImportError,
} from '@gtm-audit/core';

/** Everything the views need, computed once per file, in the browser. Nothing is sent anywhere. */
export interface AuditBundle {
  fileName: string;
  model: ContainerModel;
  graph: EntityGraph;
  events: Ga4Event[];
  result: AuditResult;
  scores: AreaScore[];
  overview: string[];
  /** Findings keyed by the entity they point at, for "findings on this row". */
  findingsByEntity: Map<string, Finding[]>;
}

export const entityKey = (kind: string, id: string) => `${kind}:${id}`;

export function buildAudit(fileName: string, text: string): { ok: true; bundle: AuditBundle } | { ok: false; error: ImportError } {
  const parsed = parseContainer(text);
  if (!parsed.ok) return parsed;
  const model = parsed.model;
  const graph = buildGraph(model);
  const events = extractGa4Events(model, graph);
  const result = audit(model);

  const findingsByEntity = new Map<string, Finding[]>();
  const add = (key: string, f: Finding) => findingsByEntity.set(key, [...(findingsByEntity.get(key) ?? []), f]);
  for (const f of result.findings) {
    add(entityKey(f.entity.kind, f.entity.id), f);
    for (const r of f.related) add(entityKey(r.kind, r.id), f);
  }

  return {
    ok: true,
    bundle: {
      fileName,
      model,
      graph,
      events,
      result,
      scores: healthScores(result),
      overview: overviewSentences(model, graph, events, result),
      findingsByEntity,
    },
  };
}

/** Findings that concern a GA4 event: on the event itself, or on any tag that sends it. */
export function findingsForEvent(b: AuditBundle, ev: Ga4Event): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  const keys = [entityKey('event', ev.name), ...ev.sends.map((s) => entityKey('tag', s.tagId))];
  for (const k of keys) {
    for (const f of b.findingsByEntity.get(k) ?? []) {
      // Event rows show what's wrong with the event; container-wide consent, ads and hygiene issues live in Risks.
      if (f.area !== 'ga4' && f.area !== 'triggers') continue;
      if (!seen.has(f.fingerprint)) {
        seen.add(f.fingerprint);
        out.push(f);
      }
    }
  }
  return out;
}

export function formatExportTime(s?: string): string {
  if (!s) return 'unknown';
  const d = new Date(s.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
