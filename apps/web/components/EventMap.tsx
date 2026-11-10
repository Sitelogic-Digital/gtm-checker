'use client';

import { triggerSentence, type Ga4Event, type Ga4Param, type Ga4Send, type ParamSource } from '@gtm-audit/core';
import { Fragment, useMemo, useState, type KeyboardEvent } from 'react';
import { findingsForEvent, type AuditBundle } from '../lib/audit';
import { Highlight } from './Highlight';
import { EmptyState, ExpandButton, FindingList, SearchField, SeverityBadge, SortHeader, useExpanded, useSort } from './ui';

const SOURCE_LABEL: Record<ParamSource['kind'], string> = {
  'data-layer': 'Data Layer',
  constant: 'Constant',
  url: 'URL',
  'custom-js': 'Custom JS',
  'js-variable': 'JS variable',
  cookie: 'Cookie',
  lookup: 'Lookup table',
  dom: 'DOM element',
  'auto-event': 'Auto-event',
  'other-variable': 'Variable',
  'built-in': 'Built-in',
  literal: 'Typed value',
  template: 'Mixed',
  missing: 'Missing',
};

const ORIGIN_LABEL: Record<Ga4Param['origin'], string> = {
  tag: 'Tag',
  'event-settings-variable': 'Shared Event Settings',
  'google-tag-shared': 'Google tag',
};

export function sourceText(s: ParamSource): string {
  const base = SOURCE_LABEL[s.kind];
  if (s.kind === 'data-layer' && s.detail) return `${base}: ${s.detail}`;
  if (s.variableName && s.kind !== 'literal') return `${base}: ${s.variableName}`;
  return base;
}

type Tab = 'events' | 'params';

export function EventMap({ b }: { b: AuditBundle }) {
  const [tab, setTab] = useState<Tab>('events');
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const next = tab === 'events' ? 'params' : 'events';
      setTab(next);
      document.getElementById(`tab-${next}`)?.focus();
    }
  };
  if (!b.events.length) return <EmptyState title="No GA4 event tags in this container.">The Event Map lists GA4 Event tags. This container doesn&rsquo;t have any.</EmptyState>;
  return (
    <div className="stack">
      <div className="tabs" role="tablist" aria-label="GA4 views" onKeyDown={onKey}>
        {(['events', 'params'] as const).map((t) => (
          <button
            key={t}
            id={`tab-${t}`}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
          >
            {t === 'events' ? 'Events' : 'Parameters'}
          </button>
        ))}
      </div>
      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'events' ? <EventsTable b={b} /> : <ParamsTable b={b} />}
      </div>
    </div>
  );
}

/* ---------------- Events ---------------- */

interface EventRow {
  ev: Ga4Event;
  tags: string[];
  mids: string[];
  paramCount: number;
  findings: ReturnType<typeof findingsForEvent>;
  worst: number;
}
const RANK = { critical: 0, warning: 1, housekeeping: 2, info: 3 } as const;

function EventsTable({ b }: { b: AuditBundle }) {
  const [q, setQ] = useState('');
  const { isOpen, toggle } = useExpanded();
  const rows = useMemo<EventRow[]>(
    () =>
      b.events.map((ev) => {
        const findings = findingsForEvent(b, ev);
        return {
          ev,
          tags: ev.sends.map((s) => s.tagName),
          mids: [...new Set(ev.sends.map((s) => s.measurementId ?? s.measurementIdRaw ?? '?'))],
          paramCount: new Set(ev.sends.flatMap((s) => s.params.map((p) => p.name))).size,
          findings,
          worst: Math.min(4, ...findings.map((f) => RANK[f.severity])),
        };
      }),
    [b],
  );
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.ev.name.toLowerCase().includes(s) || r.tags.some((t) => t.toLowerCase().includes(s)) || r.ev.sends.some((x) => x.params.some((p) => p.name.toLowerCase().includes(s))));
  }, [rows, q]);
  const { sorted, sort, onSort } = useSort(filtered, { key: 'name', dir: 'asc' }, {
    name: (r: EventRow) => r.ev.name,
    tags: (r: EventRow) => r.ev.sends.length,
    params: (r: EventRow) => r.paramCount,
    findings: (r: EventRow) => r.worst * 1000 - r.findings.length,
  });

  return (
    <div className="stack">
      <div className="spread" style={{ alignItems: 'flex-end' }}>
        <SearchField label="Filter events" value={q} onChange={setQ} placeholder="Event, tag or parameter name" />
        <p className="note" aria-live="polite">{filtered.length} of {rows.length} events</p>
      </div>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls)">
        <table className="table">
          <caption className="visually-hidden">GA4 events, one row per event name. Sortable; expand a row for its parameters and payload.</caption>
          <thead>
            <tr>
              <th scope="col"><span className="visually-hidden">Details</span></th>
              <SortHeader k="name" sort={sort} onSort={onSort}>Event</SortHeader>
              <SortHeader k="tags" sort={sort} onSort={onSort}>Sent by</SortHeader>
              <th scope="col">Measurement ID</th>
              <th scope="col">Fires</th>
              <SortHeader k="params" sort={sort} onSort={onSort} className="num">Params</SortHeader>
              <SortHeader k="findings" sort={sort} onSort={onSort}>Findings</SortHeader>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const id = `ev-${r.ev.name}`;
              const open = isOpen(id);
              const triggerIds = [...new Set(r.ev.sends.flatMap((s) => s.firingTriggerIds))];
              return (
                <Fragment key={id}>
                  <tr className="main">
                    <td><ExpandButton expanded={open} controls={`${id}-detail`} label={r.ev.name} onClick={() => toggle(id)} /></td>
                    <th scope="row" className="rowhead">
                      {r.ev.name}
                    </th>
                    <td>
                      <ul className="cell-list">
                        {r.ev.sends.map((s) => (
                          <li key={s.tagId}>{s.tagName}{s.paused && <span className="subtle"> (paused)</span>}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="mono nowrap">{r.mids.join(', ')}</td>
                    <td style={{ minWidth: 220 }}>
                      <ul className="cell-list">
                        {triggerIds.slice(0, 2).map((tid) => {
                          const t = b.graph.triggersById.get(tid);
                          return <li key={tid}>{t ? t.name : `Missing trigger ${tid}`}</li>;
                        })}
                        {triggerIds.length > 2 && <li className="subtle">and {triggerIds.length - 2} more</li>}
                      </ul>
                    </td>
                    <td className="num">{r.paramCount}</td>
                    <td>
                      {r.findings.length ? (
                        <span className="row" style={{ gap: 8 }}>
                          <SeverityBadge severity={(['critical', 'warning', 'housekeeping', 'info'] as const)[Math.min(r.worst, 3)]!} />
                          {r.findings.length > 1 && <span className="subtle">×{r.findings.length}</span>}
                        </span>
                      ) : (
                        <span className="subtle">–</span>
                      )}
                    </td>
                  </tr>
                  <tr className="detail" id={`${id}-detail`} hidden={!open}>
                    {open && (
                      <td colSpan={7}>
                        <EventDetail b={b} ev={r.ev} findings={r.findings} />
                      </td>
                    )}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EventDetail({ b, ev, findings }: { b: AuditBundle; ev: Ga4Event; findings: ReturnType<typeof findingsForEvent> }) {
  return (
    <div className="stack">
      {findings.length > 0 && (
        <div className="stack-sm">
          <h4>Findings</h4>
          <FindingList findings={findings} />
        </div>
      )}
      {ev.sends.map((s) => (
        <div key={s.tagId} className="stack" style={{ paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
          <div className="spread">
            <h4>{s.tagName}{s.paused && <span className="subtle"> (paused)</span>}</h4>
            <span className="label">Tag {s.tagId}</span>
          </div>
          <div className="stack-sm">
            <span className="label">When it fires</span>
            <ul className="cell-list">
              {s.firingTriggerIds.map((tid) => {
                const t = b.graph.triggersById.get(tid);
                return <li key={tid}><strong style={{ fontWeight: 500, color: 'var(--fg)' }}>{t?.name ?? `Trigger ${tid}`}:</strong> {t ? <Highlight text={triggerSentence(t, b.graph)} /> : 'This trigger is missing from the export.'}</li>;
              })}
              {s.blockingTriggerIds.map((tid) => {
                const t = b.graph.triggersById.get(tid);
                return <li key={`b${tid}`}><strong style={{ fontWeight: 500, color: 'var(--fg)' }}>Blocked by {t?.name ?? `trigger ${tid}`}:</strong> {t ? <Highlight text={triggerSentence(t, b.graph)} /> : ''}</li>;
              })}
            </ul>
          </div>
          <ParamTable send={s} />
          <div className="stack-sm">
            <span className="label">What this sends (variables shown as placeholders)</span>
            <Payload send={s} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ParamTable({ send }: { send: Ga4Send }) {
  const rows = send.allParamLayers;
  if (!rows.length && !send.userProperties.length) return <p className="note">No parameters beyond GA4&rsquo;s automatic ones.</p>;
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls)" style={{ maxHeight: 'none' }}>
      <table className="table">
        <caption className="visually-hidden">Parameters sent by {send.tagName}</caption>
        <thead>
          <tr>
            <th scope="col">Parameter</th>
            <th scope="col">Value</th>
            <th scope="col">Source</th>
            <th scope="col">Set in</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={`${p.name}-${i}`} className="main" style={p.overriddenBy ? { opacity: 0.55 } : undefined}>
              <td className="mono">{p.name}{p.overriddenBy && <span className="subtle"> (overridden)</span>}</td>
              <td className="mono" style={{ wordBreak: 'break-all' }}>{p.value || <span className="subtle">(empty)</span>}</td>
              <td>{sourceText(p.source)}</td>
              <td>{ORIGIN_LABEL[p.origin]}{p.origin !== 'tag' && <span className="subtle">: {p.definedIn.name}</span>}</td>
            </tr>
          ))}
          {send.userProperties.map((p) => (
            <tr key={`up-${p.name}`} className="main">
              <td className="mono">{p.name} <span className="subtle">(user property)</span></td>
              <td className="mono">{p.value}</td>
              <td>{sourceText(p.source)}</td>
              <td>{ORIGIN_LABEL[p.origin]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A mock payload: real names, variables as placeholders. Never the real values, which live on the site. */
function Payload({ send }: { send: Ga4Send }) {
  const lines: Array<[string, string, boolean]> = send.params.map((p) => [p.name, p.value, /\{\{/.test(p.value)]);
  const up: Array<[string, string, boolean]> = send.userProperties.map((p) => [p.name, p.value, /\{\{/.test(p.value)]);
  const q = (s: string) => JSON.stringify(s);
  return (
    <pre className="code" aria-label={`Example payload for ${send.eventName}`}>
      {'{\n'}
      {'  '}<span className="k">"event"</span>: {q(send.eventName)},{'\n'}
      {'  '}<span className="k">"measurement_id"</span>: {q(send.measurementId ?? send.measurementIdRaw ?? '?')},{'\n'}
      {'  '}<span className="k">"params"</span>: {'{'}{lines.length ? '\n' : ''}
      {lines.map(([k, v, ph], i) => (
        <span key={k}>
          {'    '}<span className="k">{q(k)}</span>: <span className={ph ? 'ph' : undefined}>{q(v)}</span>{i < lines.length - 1 ? ',' : ''}{'\n'}
        </span>
      ))}
      {lines.length ? '  ' : ''}{'}'}{up.length ? ',' : ''}{'\n'}
      {up.length > 0 && (
        <>
          {'  '}<span className="k">"user_properties"</span>: {'{\n'}
          {up.map(([k, v, ph], i) => (
            <span key={k}>
              {'    '}<span className="k">{q(k)}</span>: <span className={ph ? 'ph' : undefined}>{q(v)}</span>{i < up.length - 1 ? ',' : ''}{'\n'}
            </span>
          ))}
          {'  }\n'}
        </>
      )}
      {'}'}
    </pre>
  );
}

/* ---------------- Parameters ---------------- */

interface ParamRow {
  name: string;
  events: string[];
  sources: string[];
  flagged: boolean;
}

function ParamsTable({ b }: { b: AuditBundle }) {
  const [q, setQ] = useState('');
  const rows = useMemo<ParamRow[]>(() => {
    const map = new Map<string, { events: Set<string>; sources: Set<string> }>();
    for (const ev of b.events) {
      for (const s of ev.sends) {
        if (s.paused) continue;
        for (const p of s.params) {
          const r = map.get(p.name) ?? { events: new Set(), sources: new Set() };
          r.events.add(ev.name);
          r.sources.add(sourceText(p.source));
          map.set(p.name, r);
        }
      }
    }
    const flaggedNames = new Set(
      b.result.findings.filter((f) => f.ruleId === 'GA4-09').flatMap((f) => Object.keys((f.detail.spellings as Record<string, unknown>) ?? {})),
    );
    return [...map.entries()].map(([name, r]) => ({ name, events: [...r.events].sort(), sources: [...r.sources].sort(), flagged: flaggedNames.has(name) }));
  }, [b]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => r.name.toLowerCase().includes(s) || r.events.some((e) => e.toLowerCase().includes(s))) : rows;
  }, [rows, q]);
  const { sorted, sort, onSort } = useSort(filtered, { key: 'name', dir: 'asc' }, {
    name: (r: ParamRow) => r.name.toLowerCase().replace(/[_\-\s]/g, ''),
    events: (r: ParamRow) => r.events.length,
  });

  return (
    <div className="stack">
      <div className="spread" style={{ alignItems: 'flex-end' }}>
        <SearchField label="Filter parameters" value={q} onChange={setQ} placeholder="Parameter or event name" />
        <p className="note" aria-live="polite">{filtered.length} of {rows.length} parameters. Sorted by name, near-duplicates sit together.</p>
      </div>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls)">
        <table className="table">
          <caption className="visually-hidden">Every parameter name across the container, the events that send it and where its value comes from.</caption>
          <thead>
            <tr>
              <SortHeader k="name" sort={sort} onSort={onSort}>Parameter</SortHeader>
              <SortHeader k="events" sort={sort} onSort={onSort}>Used by</SortHeader>
              <th scope="col">Value comes from</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.name} className="main">
                <td className="mono">
                  {r.name}
                  {r.flagged && <> <a href="#risks/GA4-09" className="sev sev-warning" style={{ marginLeft: 8, textDecoration: 'none' }}>Spelling</a></>}
                </td>
                <td>
                  <span className="mono">{r.events.slice(0, 4).join(', ')}</span>
                  {r.events.length > 4 && <span className="subtle"> and {r.events.length - 4} more</span>}
                </td>
                <td>{r.sources.join('; ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
