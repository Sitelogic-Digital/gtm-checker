import { AREAS, SEVERITY_ORDER } from '@gtm-audit/core';
import { ORIGIN_LABEL, sourceText } from '../components/EventMap';
import { KIND_LABEL } from '../components/Risks';
import { SEV_LABEL } from '../components/ui';
import type { AuditBundle } from './audit';

/**
 * Spreadsheet downloads, built in the browser. Nothing is uploaded.
 *
 * Cells that start with = + - @ (or a tab or carriage return) would run as formulas when the file
 * opens in Excel or Sheets ("CSV injection"); container names are client-controlled, so those cells
 * get a leading apostrophe and show as plain text.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(v: unknown): string {
  let s = v === undefined || v === null ? '' : String(v);
  if (FORMULA_START.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  // The byte-order mark makes Excel read the file as UTF-8 (accents, arrows, curly quotes).
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

const areaLabel = (id: string) => AREAS.find((a) => a.id === id)?.label ?? id;
const confidenceLabel = (c: string) => (c === 'definite' ? 'Definite' : 'Check in Preview');

/** One row per finding, most serious first, in the order the Risks view lists them. */
export function issuesCsv(b: AuditBundle): string {
  const issues = b.result.issues
    .filter((i) => i.severity !== 'info')
    .sort((a, c) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(c.severity) || c.findings.length - a.findings.length);
  const rows = issues.flatMap((i) =>
    i.findings.map((f) => [
      SEV_LABEL[f.severity],
      confidenceLabel(f.confidence),
      i.title,
      areaLabel(i.area),
      KIND_LABEL[f.entity.kind] ?? f.entity.kind,
      f.entity.name,
      f.message,
      f.why,
      f.fix,
      f.where.path,
      f.where.legacyPath !== f.where.path ? f.where.legacyPath : '',
    ]),
  );
  return toCsv(
    ['Severity', 'Confidence', 'Issue', 'Area', 'Affected type', 'Affected', 'What we found', 'Why it matters', 'How to fix it', 'Where in GTM', 'Older GTM path'],
    rows,
  );
}

/**
 * The GA4 tracking plan as the container has it: one row per event, sending tag and parameter
 * (a tag with no parameters still gets one row). User properties are included and labelled.
 */
export function eventsCsv(b: AuditBundle): string {
  const trigger = (id: string) => b.model.triggers.find((t) => t.id === id)?.name ?? `Trigger ${id}`;
  const rows: unknown[][] = [];
  for (const ev of b.events) {
    for (const s of ev.sends) {
      const base = [
        ev.name,
        s.tagName,
        s.paused ? 'Yes' : 'No',
        s.measurementId ?? s.measurementIdRaw ?? '',
        s.firingTriggerIds.map(trigger).join('; '),
        s.blockingTriggerIds.map(trigger).join('; '),
      ];
      const params = [
        ...s.params.map((p) => ({ p, kind: 'Event parameter' })),
        ...s.userProperties.map((p) => ({ p, kind: 'User property' })),
      ];
      if (!params.length) rows.push([...base, '', '', '', '', '']);
      for (const { p, kind } of params) {
        rows.push([...base, p.name, kind, p.value, sourceText(p.source), ORIGIN_LABEL[p.origin] + (p.origin !== 'tag' ? `: ${p.definedIn.name}` : '')]);
      }
    }
  }
  return toCsv(['Event', 'Sent by tag', 'Paused', 'Measurement ID', 'Fires on', 'Blocked by', 'Parameter', 'Type', 'Value', 'Source', 'Set in'], rows);
}

/** "GTM-ABC123-issues-2026-11-10.csv" */
export function exportFileName(b: AuditBundle, what: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${b.model.meta.publicId || 'container'}-${what}-${day}.csv`;
}

export function downloadText(fileName: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
