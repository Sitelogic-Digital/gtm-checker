import type { ParamValue } from './model';
import type { RawParam } from './raw-types';

/** Convert one typed parameter node into a plain value. Never throws. */
export function nodeValue(node: RawParam | undefined): ParamValue {
  if (!node || typeof node !== 'object') return '';
  switch (node.type) {
    case 'BOOLEAN':
      return node.value === 'true';
    case 'LIST':
      return (node.list ?? []).map(nodeValue);
    case 'MAP':
      return flattenParams(node.map ?? []);
    case 'TAG_REFERENCE':
      return { $ref: 'tag', value: node.value ?? '' };
    case 'TRIGGER_REFERENCE':
      return { $ref: 'trigger', value: node.value ?? '' };
    case 'TEMPLATE':
    case 'INTEGER':
    default:
      if (node.value !== undefined) return String(node.value);
      if (node.list) return node.list.map(nodeValue);
      if (node.map) return flattenParams(node.map);
      return '';
  }
}

/** Turn a parameter[] array into a key → value record. Unkeyed nodes are dropped. */
export function flattenParams(params: RawParam[] | undefined): Record<string, ParamValue> {
  const out: Record<string, ParamValue> = {};
  if (!Array.isArray(params)) return out;
  for (const p of params) {
    if (p && typeof p.key === 'string') out[p.key] = nodeValue(p);
  }
  return out;
}

/** Find a top-level parameter node by key. */
export function findParam(params: RawParam[] | undefined, key: string): RawParam | undefined {
  return (params ?? []).find((p) => p?.key === key);
}

/** Read a top-level parameter as a string, or undefined if missing or not a scalar. */
export function paramString(params: Record<string, ParamValue>, key: string): string | undefined {
  const v = params[key];
  return typeof v === 'string' ? v : undefined;
}

/**
 * Walk a parameter tree and yield every string value with a readable path,
 * e.g. ["eventSettingsTable[1].parameterValue", "{{DLV - form_id}}"].
 */
export function* walkStrings(params: RawParam[] | undefined, prefix = ''): Generator<[string, string]> {
  if (!Array.isArray(params)) return;
  for (const p of params) {
    if (p && typeof p === 'object') yield* walkNode(p, joinPath(prefix, p.key));
  }
}

function* walkNode(node: RawParam, path: string): Generator<[string, string]> {
  if (typeof node.value === 'string') yield [path, node.value];
  if (Array.isArray(node.list)) {
    for (let i = 0; i < node.list.length; i++) {
      const item = node.list[i];
      if (item && typeof item === 'object') yield* walkNode(item, `${path}[${i}]`);
    }
  }
  if (Array.isArray(node.map)) {
    for (const m of node.map) {
      if (m && typeof m === 'object') yield* walkNode(m, joinPath(path, m.key));
    }
  }
}

function joinPath(prefix: string, key: string | undefined): string {
  if (!key) return prefix;
  return prefix ? `${prefix}.${key}` : key;
}

const VAR_REF = /\{\{([^{}]+?)\}\}/g;

/** Extract `{{Variable Name}}` names from a string. */
export function extractVarNames(s: string): string[] {
  const names: string[] = [];
  for (const m of s.matchAll(VAR_REF)) names.push(m[1]!.trim());
  return names;
}

/** True when the whole value is exactly one `{{Variable}}` reference. */
export function singleVarRef(s: string): string | undefined {
  const m = /^\s*\{\{([^{}]+?)\}\}\s*$/.exec(s);
  return m ? m[1]!.trim() : undefined;
}
