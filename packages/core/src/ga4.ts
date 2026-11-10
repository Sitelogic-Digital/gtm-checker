/**
 * GA4 event extraction: one entry per event name, not per tag.
 *
 * Covers legacy GA4 Event tags (gaawe). Destination tags from the 2026
 * optimization will plug in here once their parameter keys are known from
 * real exports.
 */
import type { EntityGraph } from './graph';
import type { ContainerModel, ParamValue, Tag, Variable } from './model';
import { paramString, singleVarRef } from './params';

export type ParamSourceKind =
  | 'data-layer'
  | 'constant'
  | 'url'
  | 'custom-js'
  | 'js-variable'
  | 'cookie'
  | 'lookup'
  | 'dom'
  | 'auto-event'
  | 'other-variable'
  | 'built-in'
  | 'literal'
  | 'template'
  | 'missing';

export interface ParamSource {
  kind: ParamSourceKind;
  variableName?: string;
  variableId?: string;
  /** e.g. the Data Layer key for a `v` variable. */
  detail?: string;
}

export type ParamOrigin = 'tag' | 'event-settings-variable' | 'google-tag-shared';

export interface Ga4Param {
  name: string;
  value: string;
  source: ParamSource;
  origin: ParamOrigin;
  /** The tag or variable where this row is defined: where you'd go to change it. */
  definedIn: { kind: 'tag' | 'variable'; id: string; name: string };
  /** Set when a later layer replaced this value for the same name. */
  overriddenBy?: ParamOrigin;
}

export interface Ga4Send {
  tagId: string;
  tagName: string;
  tagType: string;
  paused: boolean;
  eventName: string;
  dynamicEventName: boolean;
  /** As written in the tag, e.g. "G-ABC123" or "{{GA4 ID}}". */
  measurementIdRaw?: string;
  /** Resolved through Constant variables or the referenced config tag when possible. */
  measurementId?: string;
  /** Effective parameters after merging shared settings then tag rows (tag wins). */
  params: Ga4Param[];
  /** Every layer, including overridden values, for the parameter table. */
  allParamLayers: Ga4Param[];
  userProperties: Ga4Param[];
  firingTriggerIds: string[];
  blockingTriggerIds: string[];
  sendEcommerceData: boolean;
}

export interface Ga4Event {
  name: string;
  sends: Ga4Send[];
}

export function extractGa4Events(model: ContainerModel, graph: EntityGraph): Ga4Event[] {
  const byName = new Map<string, Ga4Send[]>();
  for (const tag of model.tags) {
    if (tag.type.key !== 'gaawe') continue;
    const send = gaaweSend(tag, model, graph);
    const list = byName.get(send.eventName) ?? [];
    list.push(send);
    byName.set(send.eventName, list);
  }
  return [...byName.entries()]
    .map(([name, sends]) => ({ name, sends }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function gaaweSend(tag: Tag, model: ContainerModel, graph: EntityGraph): Ga4Send {
  const p = tag.params;
  const eventName = paramString(p, 'eventName') ?? '';

  // Measurement ID: modern tags carry measurementIdOverride; pre-2023 tags
  // point at a GA4 Configuration tag by name via TAG_REFERENCE.
  let measurementIdRaw = paramString(p, 'measurementIdOverride');
  if (!measurementIdRaw) {
    const ref = p.measurementId;
    if (ref && typeof ref === 'object' && '$ref' in ref) {
      const cfg = model.tags.find((t) => t.name === ref.value);
      measurementIdRaw = cfg ? paramString(cfg.params, 'measurementId') ?? paramString(cfg.params, 'tagId') : undefined;
    } else if (typeof ref === 'string') {
      measurementIdRaw = ref;
    }
  }
  const measurementId = measurementIdRaw ? resolveConstant(measurementIdRaw, graph) : undefined;

  const layers: Ga4Param[] = [];
  const userProps: Ga4Param[] = [];

  // 1. Shared event settings on the Google tag for the same ID. Verify against samples.
  if (measurementId) {
    for (const gt of model.tags) {
      if (gt.type.key !== 'googtag') continue;
      if (resolveConstant(paramString(gt.params, 'tagId') ?? '', graph) !== measurementId) continue;
      layers.push(...rowsFrom(gt.params.eventSettingsTable, 'parameter', 'parameterValue', 'google-tag-shared', ref('tag', gt), graph));
      const gtVar = varFrom(paramString(gt.params, 'eventSettingsVariable'), graph);
      if (gtVar) layers.push(...rowsFrom(gtVar.params.eventSettingsTable, 'parameter', 'parameterValue', 'google-tag-shared', ref('variable', gtVar), graph));
    }
  }

  // 2. Event Settings variable (gtes) on the tag.
  const gtes = varFrom(paramString(p, 'eventSettingsVariable'), graph);
  if (gtes) {
    layers.push(...rowsFrom(gtes.params.eventSettingsTable, 'parameter', 'parameterValue', 'event-settings-variable', ref('variable', gtes), graph));
    userProps.push(...rowsFrom(gtes.params.userProperties, 'name', 'value', 'event-settings-variable', ref('variable', gtes), graph));
  }

  // 3. Rows on the tag itself.
  layers.push(...rowsFrom(p.eventSettingsTable, 'parameter', 'parameterValue', 'tag', ref('tag', tag), graph));
  userProps.push(...rowsFrom(p.userProperties, 'name', 'value', 'tag', ref('tag', tag), graph));

  return {
    tagId: tag.id,
    tagName: tag.name,
    tagType: tag.type.key,
    paused: tag.paused,
    eventName,
    dynamicEventName: /\{\{/.test(eventName),
    measurementIdRaw,
    measurementId,
    params: mergeLayers(layers),
    allParamLayers: layers,
    userProperties: mergeLayers(userProps),
    firingTriggerIds: tag.firingTriggerIds,
    blockingTriggerIds: tag.blockingTriggerIds,
    sendEcommerceData: p.sendEcommerceData === true,
  };
}

/** Later layers win. Marks the losers so the UI can show "overridden by tag". */
function mergeLayers(layers: Ga4Param[]): Ga4Param[] {
  const winners = new Map<string, Ga4Param>();
  for (const l of layers) {
    const prev = winners.get(l.name);
    if (prev) prev.overriddenBy = l.origin;
    winners.set(l.name, l);
  }
  return [...winners.values()];
}

function rowsFrom(
  table: ParamValue | undefined,
  nameKey: string,
  valueKey: string,
  origin: ParamOrigin,
  definedIn: Ga4Param['definedIn'],
  graph: EntityGraph,
): Ga4Param[] {
  if (!Array.isArray(table)) return [];
  const out: Ga4Param[] = [];
  for (const row of table) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || '$ref' in row) continue;
    const name = row[nameKey];
    const value = row[valueKey];
    if (typeof name !== 'string' || name === '') continue;
    const v = typeof value === 'string' ? value : '';
    out.push({ name, value: v, source: classifySource(v, graph), origin, definedIn });
  }
  return out;
}

const ref = (kind: 'tag' | 'variable', e: { id: string; name: string }): Ga4Param['definedIn'] => ({ kind, id: e.id, name: e.name });

function varFrom(ref: string | undefined, graph: EntityGraph): Variable | undefined {
  const name = ref ? singleVarRef(ref) : undefined;
  return name ? graph.variablesByName.get(name) : undefined;
}

/** Follow a single {{Constant}} reference to its literal value. */
export function resolveConstant(value: string, graph: EntityGraph): string {
  const name = singleVarRef(value);
  if (!name) return value.trim();
  const v = graph.variablesByName.get(name);
  if (v?.type.key === 'c') return (paramString(v.params, 'value') ?? value).trim();
  return value.trim();
}

const SOURCE_BY_VAR_TYPE: Record<string, ParamSourceKind> = {
  v: 'data-layer',
  c: 'constant',
  u: 'url',
  jsm: 'custom-js',
  j: 'js-variable',
  k: 'cookie',
  smm: 'lookup',
  remm: 'lookup',
  d: 'dom',
  aev: 'auto-event',
};

export function classifySource(value: string, graph: EntityGraph): ParamSource {
  const single = singleVarRef(value);
  if (!single) return { kind: /\{\{/.test(value) ? 'template' : 'literal' };
  const v = graph.variablesByName.get(single);
  if (!v) {
    // Built-ins and internal macros resolve without a user variable record.
    return { kind: 'built-in', variableName: single };
  }
  const kind = SOURCE_BY_VAR_TYPE[v.type.key] ?? 'other-variable';
  const detail = v.type.key === 'v' ? paramString(v.params, 'name') : v.type.key === 'u' ? paramString(v.params, 'component') : undefined;
  return { kind, variableName: v.name, variableId: v.id, detail };
}
