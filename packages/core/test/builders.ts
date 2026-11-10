/**
 * Builders for minimal, valid GTM exports. Each rule test builds exactly the
 * container it needs, so a failing test shows its own fixture in a few lines.
 */
import { BUILT_IN_VARIABLE_NAMES } from '../src/catalog/types';
import { audit, parseContainer, type Finding, type Rule } from '../src';
import type { RawCondition, RawCustomTemplate, RawExport, RawParam, RawTag, RawTrigger, RawVariable } from '../src/raw-types';

let seq = 1000;
const nextId = () => String(seq++);

export const ALL_PAGES = '2147479553';
export const INIT_ALL_PAGES = '2147479573';

export const tpl = (key: string, value: string): RawParam => ({ type: 'TEMPLATE', key, value });
export const bool = (key: string, value: boolean): RawParam => ({ type: 'BOOLEAN', key, value: String(value) });
export const table = (key: string, rows: Record<string, string>[]): RawParam => ({
  type: 'LIST',
  key,
  list: rows.map((r) => ({ type: 'MAP', map: Object.entries(r).map(([k, v]) => tpl(k, v)) })),
});
/** {name: value} → an eventSettingsTable / configSettingsTable. */
export const settings = (key: string, obj: Record<string, string>) =>
  table(key, Object.entries(obj).map(([parameter, parameterValue]) => ({ parameter, parameterValue })));

export const cond = (operator: string, left: string, right: string, opts: { negate?: boolean } = {}): RawCondition => ({
  type: operator,
  parameter: [tpl('arg0', left), tpl('arg1', right), ...(opts.negate ? [bool('negate', true)] : [])],
});

interface TagOpts {
  id?: string;
  name?: string;
  triggers?: string[];
  blocking?: string[];
  paused?: boolean;
  consent?: 'NOT_SET' | 'NOT_NEEDED' | 'NEEDED';
  params?: RawParam[];
}

export function tag(type: string, o: TagOpts = {}): RawTag {
  const id = o.id ?? nextId();
  return {
    tagId: id,
    name: o.name ?? `${type} ${id}`,
    type,
    parameter: o.params ?? [],
    firingTriggerId: o.triggers ?? [ALL_PAGES],
    blockingTriggerId: o.blocking,
    paused: o.paused,
    consentSettings: o.consent ? { consentStatus: o.consent } : undefined,
  };
}

export function ga4Event(
  eventName: string,
  eventParams: Record<string, string> = {},
  o: TagOpts & { mid?: string; settingsVariable?: string; userProperties?: Record<string, string>; ecommerce?: boolean } = {},
): RawTag {
  const params: RawParam[] = [tpl('eventName', eventName), tpl('measurementIdOverride', o.mid ?? 'G-TEST1')];
  if (Object.keys(eventParams).length) params.push(settings('eventSettingsTable', eventParams));
  if (o.settingsVariable) params.push(tpl('eventSettingsVariable', `{{${o.settingsVariable}}}`));
  if (o.userProperties) params.push(table('userProperties', Object.entries(o.userProperties).map(([name, value]) => ({ name, value }))));
  if (o.ecommerce) params.push(bool('sendEcommerceData', true));
  params.push(...(o.params ?? []));
  return tag('gaawe', { name: `GA4 - ${eventName}`, ...o, params });
}

export function googleTag(tagId: string, o: TagOpts & { config?: Record<string, string> } = {}): RawTag {
  const params = [tpl('tagId', tagId), ...(o.config ? [settings('configSettingsTable', o.config)] : [])];
  return tag('googtag', { name: `Google tag ${tagId}`, triggers: [INIT_ALL_PAGES], ...o, params });
}

export function trigger(
  type: string,
  o: { id?: string; name?: string; filters?: RawCondition[]; customEvent?: string; checkValidation?: boolean; groupOf?: string[] } = {},
): RawTrigger {
  const id = o.id ?? nextId();
  return {
    triggerId: id,
    name: o.name ?? `${type} ${id}`,
    type,
    filter: o.filters,
    customEventFilter: o.customEvent !== undefined ? [cond('EQUALS', '{{_event}}', o.customEvent)] : undefined,
    checkValidation: o.checkValidation !== undefined ? { type: 'BOOLEAN', value: String(o.checkValidation) } : undefined,
    parameter: o.groupOf ? [{ type: 'LIST', key: 'triggerIds', list: o.groupOf.map((v) => ({ type: 'TRIGGER_REFERENCE', value: v })) }] : undefined,
  };
}

export function variable(type: string, name: string, params: RawParam[] = [], id = nextId()): RawVariable {
  return { variableId: id, name, type, parameter: params };
}

export const dataLayerVar = (name: string, key: string) => variable('v', name, [tpl('name', key)]);
export const constant = (name: string, value: string) => variable('c', name, [tpl('value', value)]);

export function template(id: string, name: string, permissions: Array<{ id: string; params?: Record<string, unknown> }>): RawCustomTemplate {
  const perms = permissions.map((p) => ({
    instance: {
      key: { publicId: p.id, versionId: '1' },
      param: Object.entries(p.params ?? {}).map(([key, value]) => ({ key, value })),
    },
  }));
  return { templateId: id, name, templateData: `___INFO___\n\n{}\n\n___WEB_PERMISSIONS___\n\n${JSON.stringify(perms)}\n\n___TESTS___\n` };
}

export function container(parts: {
  tags?: RawTag[];
  triggers?: RawTrigger[];
  variables?: RawVariable[];
  templates?: RawCustomTemplate[];
  builtIns?: string[];
}): RawExport {
  return {
    exportFormatVersion: 2,
    containerVersion: {
      container: { publicId: 'GTM-TEST', accountId: '1', containerId: '2', usageContext: ['WEB'] },
      tag: parts.tags ?? [],
      trigger: parts.triggers ?? [],
      variable: parts.variables ?? [],
      customTemplate: parts.templates ?? [],
      builtInVariable: (parts.builtIns ?? ['Page URL', 'Page Path', 'Event', 'Click URL']).map((name) => ({
        name,
        type: BUILT_IN_VARIABLE_NAMES[name] ?? name,
      })),
    },
  };
}

/** Parse and run a single rule. Throws if the fixture itself is invalid or the rule errors. */
export function run(rule: Rule, raw: RawExport): Finding[] {
  const parsed = parseContainer(raw);
  if (!parsed.ok) throw new Error(parsed.error.message);
  const result = audit(parsed.model, [rule]);
  if (result.ruleErrors.length) throw new Error(result.ruleErrors[0]!.message);
  return result.findings;
}
