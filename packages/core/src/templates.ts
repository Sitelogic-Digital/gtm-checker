import type { TemplateRef } from './model';
import type { RawCustomTemplate } from './raw-types';

function permissionsSection(templateData: string | undefined): string | undefined {
  if (!templateData) return undefined;
  return /___WEB_PERMISSIONS___([\s\S]*?)(?:\n___[A-Z_]+___|$)/.exec(templateData)?.[1];
}

/** Pull the permission IDs out of a template's ___WEB_PERMISSIONS___ section. */
export function templatePermissions(templateData: string | undefined): string[] {
  const section = permissionsSection(templateData);
  if (!section) return [];
  const ids = new Set<string>();
  for (const m of section.matchAll(/"publicId"\s*:\s*"([^"]+)"/g)) ids.add(m[1]!);
  return [...ids].sort();
}

/**
 * Permission params use a typed encoding:
 *   {type:1,string} {type:2,listItem:[]} {type:3,mapKey:[],mapValue:[]} {type:8,boolean}
 */
function decode(v: unknown): unknown {
  if (!v || typeof v !== 'object') return v;
  const o = v as Record<string, unknown>;
  if ('string' in o) return o.string;
  if ('boolean' in o) return o.boolean;
  if (Array.isArray(o.listItem)) return o.listItem.map(decode);
  if (Array.isArray(o.mapKey) && Array.isArray(o.mapValue)) {
    const out: Record<string, unknown> = {};
    o.mapKey.forEach((k, i) => (out[String(decode(k))] = decode((o.mapValue as unknown[])[i])));
    return out;
  }
  return undefined;
}

const anyHost = (url: unknown) => typeof url === 'string' && /^(\*|https?:\/\/\*(\/.*)?|\*:\/\/\*.*)$/.test(url.trim());

/** Describe permissions granted without restriction. Unparseable data yields nothing rather than throwing. */
export function broadPermissions(templateData: string | undefined): string[] {
  const section = permissionsSection(templateData);
  if (!section) return [];
  let perms: unknown;
  try {
    perms = JSON.parse(section);
  } catch {
    return [];
  }
  if (!Array.isArray(perms)) return [];
  const out: string[] = [];
  for (const p of perms) {
    const inst = (p as { instance?: { key?: { publicId?: string }; param?: Array<{ key: string; value: unknown }> } })?.instance;
    const id = inst?.key?.publicId;
    if (!id) continue;
    const params: Record<string, unknown> = {};
    for (const x of inst.param ?? []) params[x.key] = decode(x.value);
    const urls = Array.isArray(params.urls) ? params.urls : [];
    switch (id) {
      case 'inject_script':
        if (urls.some(anyHost)) out.push('load scripts from any domain');
        break;
      case 'inject_hidden_iframe':
        if (params.allowedUrls === 'any' || urls.some(anyHost)) out.push('load hidden iframes from any domain');
        break;
      case 'send_pixel':
        if (params.allowedUrls === 'any' || urls.some(anyHost)) out.push('send data to any domain');
        break;
      case 'read_cookies':
        if (params.cookieAccess === 'any') out.push('read every cookie on the site');
        break;
      case 'read_data_layer':
        if (params.allowedKeys === 'any') out.push('read the whole data layer');
        break;
      case 'access_globals': {
        const keys = Array.isArray(params.keys) ? (params.keys as Array<Record<string, unknown>>) : [];
        if (keys.some((k) => k.key === '*' || k.key === 'window')) out.push('read and change any global JavaScript');
        break;
      }
    }
  }
  return out;
}

export function toTemplateRef(t: RawCustomTemplate): TemplateRef {
  const g = t.galleryReference;
  return {
    templateId: String(t.templateId),
    name: t.name ?? `Template ${t.templateId}`,
    gallery: g
      ? { host: g.host, owner: g.owner, repository: g.repository, version: g.version, galleryTemplateId: g.galleryTemplateId }
      : undefined,
    permissions: templatePermissions(t.templateData),
    broadPermissions: broadPermissions(t.templateData),
  };
}

/**
 * Template tags and variables carry one of two type shapes (both seen in real exports):
 *   cvt_<containerId>_<templateId>   e.g. cvt_56936_288
 *   cvt_<galleryTemplateId>          e.g. cvt_MQDKZ, matched via galleryReference.galleryTemplateId
 */
export function resolveTemplate(typeKey: string, templates: TemplateRef[]): TemplateRef | undefined {
  if (!typeKey.startsWith('cvt_')) return undefined;
  const rest = typeKey.slice(4);
  const byGallery = templates.find((t) => t.gallery?.galleryTemplateId === rest);
  if (byGallery) return byGallery;
  const suffix = rest.slice(rest.lastIndexOf('_') + 1);
  return templates.find((t) => t.templateId === suffix);
}

export function describeTemplate(t: TemplateRef): string {
  if (t.gallery?.owner && t.gallery.repository) {
    const v = t.gallery.version ? ` (version ${t.gallery.version.slice(0, 7)})` : '';
    return `${t.name}, from ${t.gallery.owner}/${t.gallery.repository} in the Community Template Gallery${v}`;
  }
  return `${t.name} (custom template, not from the gallery)`;
}
