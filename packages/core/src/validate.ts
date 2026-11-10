import type { RawExport } from './raw-types';

export type ImportErrorCode =
  | 'NOT_JSON'
  | 'NOT_AN_OBJECT'
  | 'GA4_EXPORT'
  | 'GTM_API_RESOURCE'
  | 'GTM_WORKSPACE_DUMP'
  | 'NOT_GTM_EXPORT'
  | 'NOT_WEB_CONTAINER';

export interface ImportError {
  code: ImportErrorCode;
  /** Written for the person who dropped the file. */
  message: string;
}

export type ValidationResult = { ok: true; raw: RawExport } | { ok: false; error: ImportError };

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Accepts a JSON string or an already-parsed value. Never throws. */
export function validateExport(input: unknown): ValidationResult {
  let data: unknown = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input.replace(/^﻿/, ''));
    } catch {
      return fail('NOT_JSON', "This file isn't valid JSON. Export the container again from GTM (Admin → Export Container) and upload the .json file it gives you.");
    }
  }

  if (!isObj(data)) {
    return fail('NOT_AN_OBJECT', "This file is JSON, but not a GTM container export. Export from GTM via Admin → Export Container.");
  }

  if (isObj(data.containerVersion)) {
    const container = data.containerVersion.container;
    const usage = isObj(container) && Array.isArray(container.usageContext) ? String(container.usageContext[0] ?? '').toUpperCase() : '';
    if (usage && usage !== 'WEB') return fail('NOT_WEB_CONTAINER', notWebMessage(usage));
    return { ok: true, raw: data as RawExport };
  }

  if (looksLikeGa4(data)) {
    return fail('GA4_EXPORT', 'This looks like a GA4 property export, not a GTM container. In GTM, go to Admin → Export Container and upload that file instead.');
  }

  if (typeof data.publicId === 'string' && typeof data.containerId === 'string') {
    return fail('GTM_API_RESOURCE', "This is a container record from the GTM API, which lists the container but not its tags. Use Admin → Export Container in GTM to get the full file.");
  }

  if (Array.isArray(data.tag) || Array.isArray(data.trigger) || Array.isArray(data.variable)) {
    return fail('GTM_WORKSPACE_DUMP', "This file has tags or triggers but isn't wrapped as a container export, so we can't tell which container or version it came from. Use Admin → Export Container in GTM.");
  }

  return fail('NOT_GTM_EXPORT', "We couldn't find a GTM container in this file. Export it from GTM via Admin → Export Container, choose a version or workspace, and upload the .json file.");
}

function notWebMessage(usage: string): string {
  const kind =
    usage === 'SERVER' ? 'a server-side container' :
    usage === 'AMP' ? 'an AMP container' :
    usage === 'ANDROID' || usage === 'IOS' ? 'a mobile app container' :
    `a "${usage.toLowerCase()}" container`;
  return `This is ${kind}. The auditor only checks web containers, the ones that hold your website's GA4 tags and triggers. Export the web container (its ID starts with GTM-) and upload that instead.`;
}

function looksLikeGa4(d: Record<string, unknown>): boolean {
  if (typeof d.name === 'string' && /^properties\/\d+/.test(d.name)) return true;
  if ('propertyType' in d || 'measurementProtocolSecret' in d) return true;
  if (Array.isArray(d.properties) || Array.isArray(d.dataStreams) || Array.isArray(d.customDimensions)) return true;
  return false;
}

function fail(code: ImportErrorCode, message: string): ValidationResult {
  return { ok: false, error: { code, message } };
}
