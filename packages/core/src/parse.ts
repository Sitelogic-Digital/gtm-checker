import { DESTINATION_TAG_TYPES } from './catalog/gtm-2026';
import {
  BUILT_IN_TRIGGERS,
  BUILT_IN_VARIABLE_NAMES,
  TAG_TYPES,
  TRIGGER_TYPES,
  VARIABLE_TYPES,
} from './catalog/types';
import type {
  BuiltInVariable,
  Condition,
  ConsentStatus,
  ContainerModel,
  Diagnostic,
  EntityBase,
  Folder,
  Tag,
  TemplateRef,
  Trigger,
  TypeInfo,
  UnknownKeySurvey,
  UsageContext,
  Variable,
  VariableRef,
} from './model';
import { extractVarNames, flattenParams, nodeValue, walkStrings } from './params';
import type { RawCondition, RawParam, RawTag, RawTrigger, RawVariable } from './raw-types';
import { detectState } from './state';
import { describeTemplate, resolveTemplate, toTemplateRef } from './templates';
import { validateExport, type ImportError } from './validate';

export type ParseOutcome = { ok: true; model: ContainerModel } | { ok: false; error: ImportError };

/* Keys we model or knowingly ignore. Anything else lands in the unknown-key survey. */
const KNOWN_KEYS = {
  export: ['exportFormatVersion', 'exportTime', 'containerVersion'],
  containerVersion: [
    'path', 'accountId', 'containerId', 'containerVersionId', 'name', 'description', 'container',
    'tag', 'trigger', 'variable', 'folder', 'builtInVariable', 'customTemplate',
    'zone', 'fingerprint', 'tagManagerUrl', 'deleted',
  ],
  container: [
    'path', 'accountId', 'containerId', 'name', 'publicId', 'usageContext', 'fingerprint',
    'tagManagerUrl', 'features', 'tagIds', 'domainName', 'notes', 'taggingServerUrls',
  ],
  tag: [
    'path', 'accountId', 'containerId', 'workspaceId', 'tagId', 'name', 'type', 'parameter',
    'fingerprint', 'firingTriggerId', 'blockingTriggerId', 'parentFolderId', 'tagFiringOption',
    'monitoringMetadata', 'monitoringMetadataTagNameKey', 'consentSettings', 'paused', 'setupTag',
    'teardownTag', 'notes', 'priority', 'tagManagerUrl', 'liveOnly', 'scheduleStartMs', 'scheduleEndMs',
    'firingRuleId', 'blockingRuleId',
  ],
  trigger: [
    'path', 'accountId', 'containerId', 'workspaceId', 'triggerId', 'name', 'type', 'parameter',
    'fingerprint', 'parentFolderId', 'notes', 'tagManagerUrl', 'filter', 'customEventFilter',
    'autoEventFilter', 'waitForTags', 'checkValidation', 'waitForTagsTimeout', 'uniqueTriggerId',
    'eventName', 'interval', 'limit', 'intervalSeconds', 'maxTimerLengthSeconds', 'selector',
    'verticalScrollPercentageList', 'horizontalScrollPercentageList', 'visibilitySelector',
    'visiblePercentageMin', 'visiblePercentageMax', 'continuousTimeMinMilliseconds',
    'totalTimeMinMilliseconds',
  ],
  variable: [
    'path', 'accountId', 'containerId', 'workspaceId', 'variableId', 'name', 'type', 'parameter',
    'fingerprint', 'parentFolderId', 'notes', 'formatValue', 'tagManagerUrl', 'enablingTriggerId',
    'disablingTriggerId', 'scheduleStartMs', 'scheduleEndMs',
  ],
  consentSettings: ['consentStatus', 'consentType'],
} as const;

/** Parse a GTM export (JSON string or parsed object). Never throws. */
export function parseContainer(input: unknown): ParseOutcome {
  const v = validateExport(input);
  if (!v.ok) return v;

  const raw = v.raw;
  const cv = raw.containerVersion;
  const diagnostics: Diagnostic[] = [];
  const unknownKeys: UnknownKeySurvey = {};

  survey(unknownKeys, 'export', raw, KNOWN_KEYS.export);
  survey(unknownKeys, 'containerVersion', cv, KNOWN_KEYS.containerVersion);
  survey(unknownKeys, 'container', cv.container, KNOWN_KEYS.container);

  const container = cv.container ?? {};

  // Templates first: tags and variables resolve their cvt_ types against them.
  const templates: TemplateRef[] = arr(cv.customTemplate)
    .filter((t) => t && t.templateId !== undefined)
    .map(toTemplateRef);

  const builtInVariables: BuiltInVariable[] = arr(cv.builtInVariable).map((b) => ({
    type: String(b.type ?? ''),
    name: String(b.name ?? b.type ?? ''),
  }));

  const folders: Folder[] = arr(cv.folder)
    .filter((f) => f && f.folderId !== undefined)
    .map((f) => ({ kind: 'folder', id: String(f.folderId), name: f.name ?? `Folder ${f.folderId}` }));

  const tags: Tag[] = [];
  for (const rt of arr(cv.tag)) {
    const t = safely(diagnostics, 'tag', rt, () => normaliseTag(rt, templates, diagnostics, unknownKeys));
    if (t) tags.push(t);
  }

  const triggers: Trigger[] = [];
  for (const rt of arr(cv.trigger)) {
    const t = safely(diagnostics, 'trigger', rt, () => normaliseTrigger(rt, diagnostics, unknownKeys));
    if (t) triggers.push(t);
  }

  const variables: Variable[] = [];
  for (const rv of arr(cv.variable)) {
    const t = safely(diagnostics, 'variable', rv, () => normaliseVariable(rv, templates, diagnostics, unknownKeys));
    if (t) variables.push(t);
  }

  // Built-in triggers are referenced by ID but never listed. Synthesise the ones in use.
  const triggerIds = new Set(triggers.map((t) => t.id));
  const referencedTriggerIds = new Set<string>();
  for (const t of tags) for (const id of [...t.firingTriggerIds, ...t.blockingTriggerIds]) referencedTriggerIds.add(id);
  for (const t of triggers) for (const id of t.groupTriggerIds) referencedTriggerIds.add(id);
  for (const id of referencedTriggerIds) {
    if (triggerIds.has(id)) continue;
    const b = BUILT_IN_TRIGGERS[id];
    if (b) {
      triggers.push(builtInTrigger(id, b.name, b.type));
      triggerIds.add(id);
    }
  }

  resolveVariableRefs([...tags, ...triggers, ...variables], variables, builtInVariables);
  checkLinks(tags, triggers, variables, folders, triggerIds, diagnostics);
  checkDuplicateIds(diagnostics, tags, triggers, variables);

  const knownCv = new Set<string>(KNOWN_KEYS.containerVersion);
  const extraContainerVersion = pickUnknown(cv, knownCv);

  const usageContext = toUsageContext(container.usageContext);

  const model: ContainerModel = {
    meta: {
      exportFormatVersion: typeof raw.exportFormatVersion === 'number' ? raw.exportFormatVersion : undefined,
      exportTime: typeof raw.exportTime === 'string' ? raw.exportTime : undefined,
      accountId: String(container.accountId ?? cv.accountId ?? ''),
      containerId: String(container.containerId ?? cv.containerId ?? ''),
      publicId: String(container.publicId ?? ''),
      containerName: String(container.name ?? ''),
      versionId: cv.containerVersionId !== undefined ? String(cv.containerVersionId) : undefined,
      versionName: typeof cv.name === 'string' ? cv.name : undefined,
      usageContext,
    },
    state: detectState(tags, triggers, extraContainerVersion),
    tags,
    triggers,
    variables,
    folders,
    builtInVariables,
    templates,
    extraContainerVersion,
    unknownKeys,
    diagnostics,
  };

  return { ok: true, model };
}

/* ---------- entities ---------- */

function base(
  raw: { name?: string; type?: string; parameter?: RawParam[]; parentFolderId?: string; notes?: string },
  id: string,
  type: TypeInfo,
  known: readonly string[],
): EntityBase {
  const rawParams = Array.isArray(raw.parameter) ? raw.parameter.filter((p) => p && typeof p === 'object') : [];
  return {
    id,
    name: raw.name ?? `(unnamed ${id})`,
    type,
    folderId: raw.parentFolderId !== undefined ? String(raw.parentFolderId) : undefined,
    notes: raw.notes,
    params: flattenParams(rawParams),
    rawParams,
    varRefs: [],
    extra: pickUnknown(raw as Record<string, unknown>, new Set(known)),
  };
}

function normaliseTag(rt: RawTag, templates: TemplateRef[], diags: Diagnostic[], survey_: UnknownKeySurvey): Tag {
  const id = String(rt.tagId);
  survey(survey_, 'tag', rt, KNOWN_KEYS.tag);
  survey(survey_, 'tag.consentSettings', rt.consentSettings, KNOWN_KEYS.consentSettings);

  const typeKey = String(rt.type ?? '');
  let type: TypeInfo;
  const known = TAG_TYPES[typeKey];
  const dest = DESTINATION_TAG_TYPES[typeKey];
  if (known) type = { key: typeKey, label: known.label, category: known.category, recognised: true };
  else if (dest) type = { key: typeKey, label: dest.label, category: 'ga4-destination', recognised: true };
  else type = templateOrUnknown(typeKey, 'template', templates, diags, { kind: 'tag', id });
  if (dest && dest.destination !== 'ga4') type.category = dest.destination === 'google-ads' ? 'google-ads' : 'floodlight';

  const cs = rt.consentSettings;
  const status = (['NOT_SET', 'NOT_NEEDED', 'NEEDED'] as const).includes(cs?.consentStatus as never)
    ? (cs!.consentStatus as ConsentStatus)
    : cs?.consentStatus
      ? 'UNKNOWN'
      : 'NOT_SET';
  const consentTypes = cs?.consentType ? toStringList(nodeValue(cs.consentType)) : [];

  const priorityVal = rt.priority ? nodeValue(rt.priority) : undefined;

  return {
    ...base(rt, id, type, KNOWN_KEYS.tag),
    kind: 'tag',
    firingTriggerIds: arr(rt.firingTriggerId).map(String),
    blockingTriggerIds: arr(rt.blockingTriggerId).map(String),
    paused: rt.paused === true,
    firingOption: rt.tagFiringOption,
    consent: { status, types: consentTypes },
    setupTagNames: arr(rt.setupTag).map((s) => s.tagName ?? '').filter(Boolean),
    teardownTagNames: arr(rt.teardownTag).map((s) => s.tagName ?? '').filter(Boolean),
    priority: typeof priorityVal === 'string' && priorityVal !== '' ? Number(priorityVal) : undefined,
  };
}

function normaliseTrigger(rt: RawTrigger, diags: Diagnostic[], survey_: UnknownKeySurvey): Trigger {
  const id = String(rt.triggerId);
  survey(survey_, 'trigger', rt, KNOWN_KEYS.trigger);
  const typeKey = String(rt.type ?? '');
  const label = TRIGGER_TYPES[typeKey];
  const type: TypeInfo = label
    ? { key: typeKey, label, category: 'trigger', recognised: true }
    : { key: typeKey, label: 'Not recognised yet', category: 'trigger', recognised: false };
  if (!label) {
    diags.push({
      level: 'warning',
      code: 'UNKNOWN_TYPE',
      message: `Trigger type "${typeKey}" isn't recognised yet.`,
      entity: { kind: 'trigger', id },
      detail: { typeKey },
    });
  }

  const params = flattenParams(rt.parameter);
  const groupTriggerIds = toRefList(params.triggerIds);

  const b = (p: RawParam | undefined) => (p ? nodeValue(p) === true : undefined);

  return {
    ...base(rt, id, type, KNOWN_KEYS.trigger),
    kind: 'trigger',
    builtIn: false,
    filters: arr(rt.filter).map(toCondition),
    customEventFilters: arr(rt.customEventFilter).map(toCondition),
    autoEventFilters: arr(rt.autoEventFilter).map(toCondition),
    waitForTags: b(rt.waitForTags),
    checkValidation: b(rt.checkValidation),
    groupTriggerIds,
  };
}

function normaliseVariable(rv: RawVariable, templates: TemplateRef[], diags: Diagnostic[], survey_: UnknownKeySurvey): Variable {
  const id = String(rv.variableId);
  survey(survey_, 'variable', rv, KNOWN_KEYS.variable);
  const typeKey = String(rv.type ?? '');
  const label = VARIABLE_TYPES[typeKey];
  const type: TypeInfo = label
    ? { key: typeKey, label, category: 'variable', recognised: true }
    : templateOrUnknown(typeKey, 'variable', templates, diags, { kind: 'variable', id });
  return { ...base(rv, id, type, KNOWN_KEYS.variable), kind: 'variable' };
}

function templateOrUnknown(
  typeKey: string,
  category: 'template' | 'variable',
  templates: TemplateRef[],
  diags: Diagnostic[],
  entity: { kind: 'tag' | 'variable'; id: string },
): TypeInfo {
  if (typeKey.startsWith('cvt_')) {
    const tpl = resolveTemplate(typeKey, templates);
    if (tpl) return { key: typeKey, label: describeTemplate(tpl), category, recognised: true, template: tpl };
    diags.push({
      level: 'warning',
      code: 'UNRESOLVED_TEMPLATE',
      message: `${entity.kind === 'tag' ? 'Tag' : 'Variable'} uses template type "${typeKey}", but that template isn't in the export.`,
      entity,
      detail: { typeKey },
    });
    return { key: typeKey, label: 'Custom template (not in export)', category, recognised: false };
  }
  diags.push({
    level: 'warning',
    code: 'UNKNOWN_TYPE',
    message: `${entity.kind === 'tag' ? 'Tag' : 'Variable'} type "${typeKey}" isn't recognised yet.`,
    entity,
    detail: { typeKey },
  });
  return { key: typeKey, label: 'Not recognised yet', category: category === 'template' ? 'other' : 'variable', recognised: false };
}

function builtInTrigger(id: string, name: string, typeKey: string): Trigger {
  return {
    kind: 'trigger',
    id,
    name,
    type: { key: typeKey, label: TRIGGER_TYPES[typeKey] ?? typeKey, category: 'trigger', recognised: true },
    params: {},
    rawParams: [],
    varRefs: [],
    extra: {},
    builtIn: true,
    filters: [],
    customEventFilters: [],
    autoEventFilters: [],
    groupTriggerIds: [],
  };
}

function toCondition(c: RawCondition): Condition {
  const p = flattenParams(c.parameter);
  return {
    operator: String(c.type ?? ''),
    left: typeof p.arg0 === 'string' ? p.arg0 : '',
    right: typeof p.arg1 === 'string' ? p.arg1 : '',
    negate: p.negate === true,
    ignoreCase: p.ignore_case === true,
  };
}

/* ---------- references and links ---------- */

function resolveVariableRefs(
  entities: Array<Tag | Trigger | Variable>,
  variables: Variable[],
  builtIns: BuiltInVariable[],
) {
  const byName = new Map(variables.map((v) => [v.name, v.id]));
  const enabledBuiltIns = new Map(builtIns.map((b) => [b.name, b.type]));

  const resolve = (name: string): VariableRef['resolution'] => {
    const userId = byName.get(name);
    if (userId) return { kind: 'user', variableId: userId };
    if (enabledBuiltIns.has(name)) return { kind: 'builtin-enabled', builtInType: enabledBuiltIns.get(name) };
    // GTM-internal macros such as {{_event}} in Custom Event triggers.
    if (name.startsWith('_')) return { kind: 'builtin-enabled', builtInType: 'INTERNAL' };
    const knownBuiltIn = BUILT_IN_VARIABLE_NAMES[name];
    if (knownBuiltIn) return { kind: 'builtin-disabled', builtInType: knownBuiltIn };
    return { kind: 'missing' };
  };

  for (const e of entities) {
    const refs: VariableRef[] = [];
    for (const [path, value] of walkStrings(e.rawParams, 'parameter')) {
      for (const name of extractVarNames(value)) refs.push({ name, path, resolution: resolve(name) });
    }
    if (e.kind === 'trigger') {
      const lists = [
        ['filter', e.filters],
        ['customEventFilter', e.customEventFilters],
        ['autoEventFilter', e.autoEventFilters],
      ] as const;
      for (const [label, conds] of lists) {
        conds.forEach((c, i) => {
          for (const side of ['left', 'right'] as const) {
            for (const name of extractVarNames(c[side])) {
              refs.push({ name, path: `${label}[${i}].${side === 'left' ? 'arg0' : 'arg1'}`, resolution: resolve(name) });
            }
          }
        });
      }
    }
    e.varRefs = refs;
  }
}

function checkLinks(
  tags: Tag[],
  triggers: Trigger[],
  variables: Variable[],
  folders: Folder[],
  triggerIds: Set<string>,
  diags: Diagnostic[],
) {
  const folderIds = new Set(folders.map((f) => f.id));
  const tagNames = new Set(tags.map((t) => t.name));

  for (const t of tags) {
    for (const id of [...t.firingTriggerIds, ...t.blockingTriggerIds]) {
      if (!triggerIds.has(id)) {
        diags.push({
          level: 'error',
          code: 'DANGLING_TRIGGER',
          message: `Tag "${t.name}" points at trigger ID ${id}, which isn't in the export.`,
          entity: { kind: 'tag', id: t.id },
          detail: { triggerId: id },
        });
      }
    }
    for (const name of [...t.setupTagNames, ...t.teardownTagNames]) {
      if (!tagNames.has(name)) {
        diags.push({
          level: 'error',
          code: 'DANGLING_TAG_REF',
          message: `Tag "${t.name}" sequences with a tag called "${name}", which isn't in the export.`,
          entity: { kind: 'tag', id: t.id },
          detail: { tagName: name },
        });
      }
    }
  }
  for (const t of triggers) {
    for (const id of t.groupTriggerIds) {
      if (!triggerIds.has(id)) {
        diags.push({
          level: 'error',
          code: 'DANGLING_TRIGGER',
          message: `Trigger group "${t.name}" includes trigger ID ${id}, which isn't in the export.`,
          entity: { kind: 'trigger', id: t.id },
          detail: { triggerId: id },
        });
      }
    }
  }
  for (const e of [...tags, ...triggers, ...variables]) {
    if (e.folderId && !folderIds.has(e.folderId)) {
      diags.push({
        level: 'warning',
        code: 'DANGLING_FOLDER',
        message: `"${e.name}" sits in folder ID ${e.folderId}, which isn't in the export.`,
        entity: { kind: e.kind, id: e.id },
        detail: { folderId: e.folderId },
      });
    }
  }
}

function checkDuplicateIds(diags: Diagnostic[], ...groups: Array<Array<{ kind: 'tag' | 'trigger' | 'variable'; id: string }>>) {
  for (const group of groups) {
    const seen = new Set<string>();
    for (const e of group) {
      if (seen.has(e.id)) {
        diags.push({
          level: 'error',
          code: 'DUPLICATE_ID',
          message: `Two ${e.kind}s share ID ${e.id}. The export may be corrupted.`,
          entity: { kind: e.kind, id: e.id },
        });
      }
      seen.add(e.id);
    }
  }
}

/* ---------- helpers ---------- */

function safely<T>(
  diags: Diagnostic[],
  kind: 'tag' | 'trigger' | 'variable',
  raw: unknown,
  fn: () => T,
): T | undefined {
  const idKey = `${kind}Id`;
  const id = raw && typeof raw === 'object' ? (raw as Record<string, unknown>)[idKey] : undefined;
  if (id === undefined || id === null) {
    diags.push({
      level: 'error',
      code: 'MALFORMED_ENTITY',
      message: `Skipped a ${kind} with no ${idKey}.`,
      detail: { name: (raw as Record<string, unknown> | undefined)?.name },
    });
    return undefined;
  }
  try {
    return fn();
  } catch (err) {
    diags.push({
      level: 'error',
      code: 'MALFORMED_ENTITY',
      message: `Couldn't read ${kind} ${String(id)}: ${err instanceof Error ? err.message : String(err)}`,
      entity: { kind, id: String(id) },
    });
    return undefined;
  }
}

function survey(out: UnknownKeySurvey, location: string, obj: unknown, known: readonly string[]) {
  if (!obj || typeof obj !== 'object') return;
  const k = new Set(known);
  for (const key of Object.keys(obj)) {
    if (k.has(key)) continue;
    const bucket = (out[location] ??= {});
    bucket[key] = (bucket[key] ?? 0) + 1;
  }
}

function pickUnknown(obj: Record<string, unknown>, known: Set<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (!known.has(k)) out[k] = v;
  return out;
}

/** Arrays only, with null/non-object items removed so a malformed entry can't crash the parse. */
function arr<T>(v: T[] | undefined): T[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x !== null && x !== undefined);
}

function toStringList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function toRefList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (x && typeof x === 'object' && '$ref' in x ? String((x as { value: string }).value) : typeof x === 'string' ? x : ''))
    .filter(Boolean);
}

function toUsageContext(u: string[] | undefined): UsageContext {
  // Non-web containers are rejected in validateExport, so anything here is web or unlabelled.
  return Array.isArray(u) && String(u[0] ?? '').toLowerCase() === 'web' ? 'web' : 'unknown';
}

