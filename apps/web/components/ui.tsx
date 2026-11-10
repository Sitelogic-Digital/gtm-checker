'use client';

import type { Confidence, Finding, Severity } from '@gtm-audit/core';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { Highlight } from './Highlight';

export const SEV_LABEL: Record<Severity, string> = { critical: 'Critical', warning: 'Warning', housekeeping: 'Housekeeping', info: 'Info' };

/** The word is always present, so severity never depends on colour alone. Info renders nothing. */
export function SeverityBadge({ severity }: { severity: Severity }) {
  if (severity === 'info') return null;
  return <span className={`sev sev-${severity}`}>{SEV_LABEL[severity]}</span>;
}

export function ConfidenceMark({ confidence }: { confidence: Confidence }) {
  return confidence === 'definite' ? (
    <span className="conf" title="Provable from the container file">Definite</span>
  ) : (
    <span className="conf conf-preview" title="Likely, but depends on how the site behaves">Check in Preview</span>
  );
}

export function ExpandButton({ expanded, onClick, controls, label }: { expanded: boolean; onClick: () => void; controls: string; label: string }) {
  return (
    <button type="button" className="expand" aria-expanded={expanded} aria-controls={controls} onClick={onClick}>
      <span aria-hidden="true">+</span>
      <span className="visually-hidden">{expanded ? `Hide details for ${label}` : `Show details for ${label}`}</span>
    </button>
  );
}

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function FilterChips<T extends string>({ label, options, value, onChange }: { label: string; options: ChipOption<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined && <span className="n">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SearchField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = useId();
  return (
    <label className="sl-field search" htmlFor={id}>
      <span className="sl-field-label">{label}</span>
      <input id={id} className="sl-field-input" type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p className="muted" style={{ marginTop: 8 }}>{children}</p>}
    </div>
  );
}

/** Sortable column header. Sort state lives in useSort. */
export function SortHeader<K extends string>({ k, sort, onSort, children, className }: { k: K; sort: SortState<K>; onSort: (k: K) => void; children: ReactNode; className?: string }) {
  const active = sort.key === k;
  return (
    <th scope="col" className={className} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" onClick={() => onSort(k)}>
        {children}
        <span aria-hidden="true">{active ? (sort.dir === 'asc' ? '↑' : '↓') : ''}</span>
      </button>
    </th>
  );
}

export interface SortState<K extends string> {
  key: K;
  dir: 'asc' | 'desc';
}

export function useSort<T, K extends string>(rows: T[], initial: SortState<NoInfer<K>>, accessors: Record<K, (row: T) => string | number>) {
  const [sort, setSort] = useState<SortState<K>>(initial);
  const sorted = useMemo(() => {
    const get = accessors[sort.key];
    const out = [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sort.dir === 'asc' ? c : -c;
    });
    return out;
    // accessors are stable per render site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);
  const onSort = (key: K) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  return { sorted, sort, onSort };
}

export function useExpanded() {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return { isOpen: (id: string) => open.has(id), toggle, setOpen };
}

/** Compact list of findings for a row's detail panel. */
export function FindingList({ findings }: { findings: Finding[] }) {
  if (!findings.length) return <p className="note">No findings.</p>;
  return (
    <ul className="cell-list">
      {findings.map((f) => (
        <li key={f.fingerprint} className="row" style={{ alignItems: 'baseline', gap: 12 }}>
          <SeverityBadge severity={f.severity} />
          <span>
            <a href={`#risks/${f.ruleId}`} className="mono" style={{ color: 'var(--fg)' }}>{f.ruleId}</a> <Highlight text={f.message} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Text with names and details in quotes or brackets blanked, to spot sentences that only differ by name. */
export const sentenceShape = (t: string) => t.replace(/"[^"]*"|“[^”]*”|\([^)]*\)/g, '…');

/** Distinct texts, treating sentences that only differ by a quoted name or example as the same (keeps the first). */
export function distinctTexts(texts: string[]): string[] {
  const seen = new Map<string, string>();
  for (const t of texts) if (!seen.has(sentenceShape(t))) seen.set(sentenceShape(t), t);
  return [...seen.values()];
}
