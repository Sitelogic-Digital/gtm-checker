'use client';

import { triggerSentence, type Finding, type Trigger } from '@gtm-audit/core';
import { useMemo, useState } from 'react';
import { entityKey, type AuditBundle } from '../lib/audit';
import { Highlight } from './Highlight';
import { EmptyState, FilterChips, SearchField, SeverityBadge, SortHeader, useSort } from './ui';

type Filter = 'all' | 'used' | 'unused' | 'findings';

interface Row {
  t: Trigger;
  sentence: string;
  firing: string[];
  blocking: string[];
  groups: string[];
  unused: boolean;
  findings: Finding[];
}

export function Triggers({ b }: { b: AuditBundle }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const unused = useMemo(() => new Set(b.graph.unusedTriggerIds), [b]);

  const rows = useMemo<Row[]>(
    () =>
      b.model.triggers.map((t) => {
        const use = b.graph.tagsByTrigger.get(t.id) ?? { firing: [], blocking: [] };
        const name = (id: string) => b.graph.tagsById.get(id)?.name ?? id;
        return {
          t,
          sentence: triggerSentence(t, b.graph),
          firing: use.firing.map(name),
          blocking: use.blocking.map(name),
          groups: (b.graph.groupsByTrigger.get(t.id) ?? []).map((g) => b.graph.triggersById.get(g)?.name ?? g),
          unused: unused.has(t.id),
          findings: (b.findingsByEntity.get(entityKey('trigger', t.id)) ?? []).filter((f) => f.ruleId !== 'TRG-06'),
        };
      }),
    [b, unused],
  );

  const counts = {
    all: rows.length,
    used: rows.filter((r) => !r.unused).length,
    unused: rows.filter((r) => r.unused).length,
    findings: rows.filter((r) => r.findings.length).length,
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'used' && r.unused) return false;
      if (filter === 'unused' && !r.unused) return false;
      if (filter === 'findings' && !r.findings.length) return false;
      return !s || r.t.name.toLowerCase().includes(s) || r.sentence.toLowerCase().includes(s) || r.firing.some((x) => x.toLowerCase().includes(s));
    });
  }, [rows, q, filter]);

  const { sorted, sort, onSort } = useSort(filtered, { key: 'name', dir: 'asc' }, {
    name: (r: Row) => (r.t.builtIn ? ' ' : '') + r.t.name.toLowerCase(),
    feeds: (r: Row) => r.firing.length + r.blocking.length,
  });

  return (
    <div className="stack">
      <div className="spread" style={{ alignItems: 'flex-end' }}>
        <SearchField label="Filter triggers" value={q} onChange={setQ} placeholder="Trigger, condition or tag name" />
        <FilterChips<Filter>
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'used', label: 'Used', count: counts.used },
            { value: 'unused', label: 'Not used', count: counts.unused },
            { value: 'findings', label: 'With findings', count: counts.findings },
          ]}
        />
      </div>
      {sorted.length === 0 ? (
        <EmptyState title="No triggers match.">Try a different filter or search.</EmptyState>
      ) : (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls)">
          <table className="table">
            <caption className="visually-hidden">Every trigger written as a sentence, with the tags it feeds.</caption>
            <thead>
              <tr>
                <SortHeader k="name" sort={sort} onSort={onSort}>Trigger</SortHeader>
                <th scope="col">What it does</th>
                <SortHeader k="feeds" sort={sort} onSort={onSort}>Feeds</SortHeader>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.t.id} className="main">
                  <td style={{ minWidth: 220 }}>
                    <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{r.t.name}</span>
                    <div className="label" style={{ marginTop: 4 }}>{r.t.builtIn ? 'Built-in' : r.t.type.label}</div>
                  </td>
                  <td style={{ minWidth: 320 }}>
                    <p><Highlight text={r.sentence} /></p>
                    {r.findings.length > 0 && (
                      <ul className="cell-list" style={{ marginTop: 8 }}>
                        {r.findings.map((f) => (
                          <li key={f.fingerprint} className="row" style={{ alignItems: 'baseline', gap: 8 }}>
                            <SeverityBadge severity={f.severity} /> <a href={`#risks/${f.ruleId}`}>{f.ruleTitle}</a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td style={{ minWidth: 220 }}>
                    {r.unused ? (
                      <span className="sev sev-housekeeping">Nothing</span>
                    ) : (
                      <ul className="cell-list">
                        {r.firing.slice(0, 4).map((n, i) => <li key={`f${i}`}>{n}</li>)}
                        {r.firing.length > 4 && <li className="subtle">and {r.firing.length - 4} more</li>}
                        {r.blocking.map((n, i) => <li key={`b${i}`} className="subtle">Blocks {n}</li>)}
                        {r.groups.map((n, i) => <li key={`g${i}`} className="subtle">Part of {n}</li>)}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
