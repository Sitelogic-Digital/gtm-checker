'use client';

import { SCORE_METHOD, SEVERITY_ORDER } from '@gtm-audit/core';
import { useState } from 'react';
import type { AuditBundle } from '../lib/audit';
import { Highlight } from './Highlight';
import { ConfidenceMark, plural, SeverityBadge } from './ui';

export function Overview({ b }: { b: AuditBundle }) {
  const { model, result } = b;
  const [explained, setExplained] = useState<string | null>(null);

  const top = [...result.issues]
    .filter((i) => i.severity !== 'info')
    .sort((a, c) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(c.severity) || c.findings.length - a.findings.length)
    .slice(0, 5);

  const tagTypes = new Map<string, { label: string; count: number; paused: number }>();
  for (const t of model.tags) {
    const label = t.type.template?.name ?? t.type.label;
    const cur = tagTypes.get(label) ?? { label, count: 0, paused: 0 };
    cur.count++;
    if (t.paused) cur.paused++;
    tagTypes.set(label, cur);
  }
  const folders = model.folders.map((f) => ({ name: f.name, count: b.graph.folderContents.get(f.id)?.length ?? 0 }));
  const unfiled = [...model.tags, ...model.triggers.filter((t) => !t.builtIn), ...model.variables].filter((e) => !e.folderId).length;

  return (
    <div className="stack-lg">
      <section className="sentences" aria-label="Summary">
        {b.overview.map((s, i) => (
          <p key={i}><Highlight text={s} numbers /></p>
        ))}
      </section>

      <section aria-labelledby="scores-h" className="stack">
        <div className="spread">
          <h2 id="scores-h" className="h3">Health by area</h2>
        </div>
        <div className="scores">
          {b.scores.map((s) => {
            const open = explained === s.area;
            const panelId = `score-${s.area}`;
            return (
              <div key={s.area} className="score">
                <span className="label">{s.label}</span>
                <span className="score-value">
                  {s.score}
                  <small>/ 100</small>
                </span>
                <button type="button" className="disclosure" aria-expanded={open} aria-controls={panelId} onClick={() => setExplained(open ? null : s.area)}>
                  {open ? 'Hide' : 'See why'}
                </button>
                <div id={panelId} hidden={!open}>
                  {s.deductions.length ? (
                    <ul className="deductions">
                      {s.deductions.map((d) => (
                        <li key={d.ruleId}>
                          <span>
                            <a href={`#risks/${d.ruleId}`}>{d.ruleId}</a> {d.title}
                            {d.findings > 1 ? ` (${d.findings})` : ''}
                          </span>
                          <span className="pts">−{d.points}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="note">Nothing found in this area.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="note" style={{ maxWidth: '60rem' }}>{SCORE_METHOD}</p>
      </section>

      <section aria-labelledby="top-h" className="stack">
        <h2 id="top-h" className="h3">Fix these first</h2>
        {top.length ? (
          <ol className="top-issues">
            {top.map((i) => (
              <li key={`${i.ruleId}-${i.severity}`}>
                <a href={`#risks/${i.ruleId}`}>
                  <SeverityBadge severity={i.severity} />
                  <span>
                    <span style={{ fontWeight: 500 }}>{i.title}</span>
                    <span className="row" style={{ marginTop: 4 }}>
                      <span className="mono subtle" style={{ fontSize: 12 }}>{i.ruleId}</span>
                      <span className="subtle" style={{ fontSize: 14 }}>{plural(i.findings.length, 'item')}</span>
                      <ConfidenceMark confidence={i.confidence} />
                    </span>
                  </span>
                  <span className="arrow" aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">Nothing to fix. That&rsquo;s rare.</p>
        )}
      </section>

      <div className="facts" style={{ display: 'grid', gap: 'var(--space-12)', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <section aria-labelledby="types-h" className="stack">
          <h2 id="types-h" className="h3">Tags by type</h2>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls)">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col" className="num">Tags</th>
                  <th scope="col" className="num">Paused</th>
                </tr>
              </thead>
              <tbody>
                {[...tagTypes.values()].sort((a, c) => c.count - a.count).map((t) => (
                  <tr key={t.label} className="main">
                    <td>{t.label}</td>
                    <td className="num">{t.count}</td>
                    <td className="num">{t.paused || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="folders-h" className="stack">
          <h2 id="folders-h" className="h3">Folders</h2>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls)">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Folder</th>
                  <th scope="col" className="num">Items</th>
                </tr>
              </thead>
              <tbody>
                {folders.map((f) => (
                  <tr key={f.name} className="main">
                    <td>{f.name}</td>
                    <td className="num">{f.count}</td>
                  </tr>
                ))}
                <tr className="main">
                  <td className="subtle">Unfiled Items</td>
                  <td className="num">{unfiled}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="note">Ownership isn&rsquo;t in a container export, so it isn&rsquo;t shown here.</p>
        </section>
      </div>
    </div>
  );
}
