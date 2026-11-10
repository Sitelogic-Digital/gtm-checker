import { lookupDomain } from '../../config/known-domains';
import { paramString } from '../../params';
import { ALL_STATES, list, tagEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

const PATTERNS = [
  /<script\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi,
  /\.src\s*=\s*["']([^"']+)["']/g,
  /setAttribute\(\s*["']src["']\s*,\s*["']([^"']+)["']/g,
];

/** Absolute script URLs loaded by a Custom HTML block. Relative and templated hosts are skipped. */
export function scriptSources(html: string): URL[] {
  const out: URL[] = [];
  for (const re of PATTERNS) {
    for (const m of html.matchAll(re)) {
      const raw = m[1]!.trim();
      if (!/^(https?:)?\/\//i.test(raw)) continue;
      try {
        const u = new URL(raw.startsWith('//') ? `https:${raw}` : raw);
        if (!u.host.includes('{{')) out.push(u);
      } catch {
        /* not a URL */
      }
    }
  }
  return out;
}

export const RSK_04: Rule = {
  id: 'RSK-04',
  title: 'Custom HTML loading unrecognised scripts or using document.write',
  area: 'hygiene',
  severity: 'warning',
  confidence: 'check-in-preview',
  appliesTo: ALL_STATES,
  why: 'Custom HTML runs with full access to the page. A script from an unknown domain can read form fields and cookies, and it changes whenever its owner changes it. document.write can blank the page or block rendering when it runs after load.',
  fix: 'Find out who owns the script and whether it\'s still needed. Prefer a Community Template, which has to declare what it can do. Replace document.write with a script element added to the page.',
  where: WHERE.tags,
  run({ model }) {
    const out: FindingDraft[] = [];
    for (const t of model.tags) {
      if (t.paused || t.type.key !== 'html') continue;
      const html = paramString(t.params, 'html') ?? '';
      const unknown = [...new Set(scriptSources(html).filter((u) => !lookupDomain(u.host)).map((u) => u.host))].sort();
      if (unknown.length) {
        out.push({
          entity: tagEntity(t),
          message: `This Custom HTML tag loads scripts from ${unknown.length === 1 ? 'a domain' : 'domains'} we don't recognise: ${list(unknown)}.`,
          detailKey: `domains:${unknown.join(',')}`,
          detail: { domains: unknown },
        });
      }
      if (/document\.write(ln)?\s*\(/.test(html) || t.params.supportDocumentWrite === true) {
        out.push({
          entity: tagEntity(t),
          message: 'This Custom HTML tag uses document.write.',
          detailKey: 'document.write',
        });
      }
    }
    return out;
  },
};
