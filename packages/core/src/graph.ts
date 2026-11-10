import type { ContainerModel, Folder, Tag, Trigger, Variable } from './model';

export type EntityKind = 'tag' | 'trigger' | 'variable';
export interface EntityRef {
  kind: EntityKind;
  id: string;
}
export interface UsageRef extends EntityRef {
  path: string;
}

export interface EntityGraph {
  tagsById: Map<string, Tag>;
  triggersById: Map<string, Trigger>;
  variablesById: Map<string, Variable>;
  variablesByName: Map<string, Variable>;
  foldersById: Map<string, Folder>;
  /** Trigger ID → tags that fire or are blocked on it. */
  tagsByTrigger: Map<string, { firing: string[]; blocking: string[] }>;
  /** Trigger ID → trigger groups that include it. */
  groupsByTrigger: Map<string, string[]>;
  /** Variable ID → every place it's referenced. */
  variableUsage: Map<string, UsageRef[]>;
  /** Folder ID → entities inside it. */
  folderContents: Map<string, EntityRef[]>;
  /** Triggers no tag uses, directly or through a trigger group. Built-ins excluded. */
  unusedTriggerIds: string[];
  /** User variables nothing references. */
  unusedVariableIds: string[];
}

export function buildGraph(model: ContainerModel): EntityGraph {
  const tagsById = new Map(model.tags.map((t) => [t.id, t]));
  const triggersById = new Map(model.triggers.map((t) => [t.id, t]));
  const variablesById = new Map(model.variables.map((v) => [v.id, v]));
  const variablesByName = new Map(model.variables.map((v) => [v.name, v]));
  const foldersById = new Map(model.folders.map((f) => [f.id, f]));

  const tagsByTrigger = new Map<string, { firing: string[]; blocking: string[] }>();
  const slot = (id: string) => {
    let s = tagsByTrigger.get(id);
    if (!s) tagsByTrigger.set(id, (s = { firing: [], blocking: [] }));
    return s;
  };
  for (const t of model.tags) {
    for (const id of t.firingTriggerIds) slot(id).firing.push(t.id);
    for (const id of t.blockingTriggerIds) slot(id).blocking.push(t.id);
  }

  const groupsByTrigger = new Map<string, string[]>();
  for (const g of model.triggers) {
    for (const id of g.groupTriggerIds) {
      const list = groupsByTrigger.get(id) ?? [];
      list.push(g.id);
      groupsByTrigger.set(id, list);
    }
  }

  // A trigger is used if a tag uses it, or a used group contains it.
  const used = new Set<string>(tagsByTrigger.keys());
  let changed = true;
  while (changed) {
    changed = false;
    for (const [memberId, groupIds] of groupsByTrigger) {
      if (!used.has(memberId) && groupIds.some((g) => used.has(g))) {
        used.add(memberId);
        changed = true;
      }
    }
  }
  const unusedTriggerIds = model.triggers.filter((t) => !t.builtIn && !used.has(t.id)).map((t) => t.id);

  const variableUsage = new Map<string, UsageRef[]>();
  for (const e of [...model.tags, ...model.triggers, ...model.variables]) {
    for (const r of e.varRefs) {
      if (r.resolution.kind !== 'user') continue;
      const list = variableUsage.get(r.resolution.variableId) ?? [];
      list.push({ kind: e.kind, id: e.id, path: r.path });
      variableUsage.set(r.resolution.variableId, list);
    }
  }
  const unusedVariableIds = model.variables
    .filter((v) => !(variableUsage.get(v.id) ?? []).some((u) => !(u.kind === 'variable' && u.id === v.id)))
    .map((v) => v.id);

  const folderContents = new Map<string, EntityRef[]>();
  for (const e of [...model.tags, ...model.triggers, ...model.variables]) {
    if (!e.folderId) continue;
    const list = folderContents.get(e.folderId) ?? [];
    list.push({ kind: e.kind, id: e.id });
    folderContents.set(e.folderId, list);
  }

  return {
    tagsById,
    triggersById,
    variablesById,
    variablesByName,
    foldersById,
    tagsByTrigger,
    groupsByTrigger,
    variableUsage,
    folderContents,
    unusedTriggerIds,
    unusedVariableIds,
  };
}
