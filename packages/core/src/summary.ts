import { extractGa4Events } from './ga4';
import { buildGraph } from './graph';
import type { ContainerModel } from './model';

/** Counts that should match what the GTM UI shows for the same version. */
export interface ContainerSummary {
  publicId: string;
  containerName: string;
  versionId?: string;
  exportTime?: string;
  usageContext: string;
  state: string;
  stateProvisional: boolean;
  counts: {
    tags: number;
    pausedTags: number;
    triggers: number;
    variables: number;
    /** User-created folders only. The GTM UI also shows a virtual "Unfiled Items" folder, so it displays one more. */
    folders: number;
    /** Tags, triggers and variables with no folder: what GTM lists under "Unfiled Items". */
    unfiledItems: number;
    templates: number;
    builtInVariablesEnabled: number;
  };
  tagTypes: Record<string, number>;
  ga4: { events: number; measurementIds: string[] };
  unusedTriggers: number;
  unusedVariables: number;
  unrecognisedTypes: Array<{ kind: string; typeKey: string; count: number }>;
  missingVariableRefs: string[];
  diagnostics: Record<string, number>;
}

export function summarise(model: ContainerModel): ContainerSummary {
  const graph = buildGraph(model);
  const events = extractGa4Events(model, graph);

  const tagTypes: Record<string, number> = {};
  for (const t of model.tags) tagTypes[t.type.key] = (tagTypes[t.type.key] ?? 0) + 1;

  const unrecognised = new Map<string, { kind: string; typeKey: string; count: number }>();
  for (const e of [...model.tags, ...model.triggers, ...model.variables]) {
    if (e.type.recognised) continue;
    const k = `${e.kind}:${e.type.key}`;
    const cur = unrecognised.get(k) ?? { kind: e.kind, typeKey: e.type.key, count: 0 };
    cur.count++;
    unrecognised.set(k, cur);
  }

  const missing = new Set<string>();
  for (const e of [...model.tags, ...model.triggers, ...model.variables]) {
    for (const r of e.varRefs) if (r.resolution.kind === 'missing' || r.resolution.kind === 'builtin-disabled') missing.add(r.name);
  }

  const diagnostics: Record<string, number> = {};
  for (const d of model.diagnostics) diagnostics[d.code] = (diagnostics[d.code] ?? 0) + 1;

  const ids = new Set<string>();
  for (const ev of events) for (const s of ev.sends) if (s.measurementId) ids.add(s.measurementId);

  return {
    publicId: model.meta.publicId,
    containerName: model.meta.containerName,
    versionId: model.meta.versionId,
    exportTime: model.meta.exportTime,
    usageContext: model.meta.usageContext,
    state: model.state.state,
    stateProvisional: model.state.provisional,
    counts: {
      tags: model.tags.length,
      pausedTags: model.tags.filter((t) => t.paused).length,
      triggers: model.triggers.filter((t) => !t.builtIn).length,
      variables: model.variables.length,
      folders: model.folders.length,
      unfiledItems: [...model.tags, ...model.triggers.filter((t) => !t.builtIn), ...model.variables].filter((e) => !e.folderId).length,
      templates: model.templates.length,
      builtInVariablesEnabled: model.builtInVariables.length,
    },
    tagTypes,
    ga4: { events: events.length, measurementIds: [...ids].sort() },
    unusedTriggers: graph.unusedTriggerIds.length,
    unusedVariables: graph.unusedVariableIds.length,
    unrecognisedTypes: [...unrecognised.values()].sort((a, b) => b.count - a.count),
    missingVariableRefs: [...missing].sort(),
    diagnostics,
  };
}
