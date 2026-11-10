'use client';

import { AREAS, type Area, type IssueGroup, type Severity } from '@gtm-audit/core';
import { useEffect, useMemo, useState } from 'react';
import type { AuditBundle } from '../lib/audit';
import { Highlight } from './Highlight';
import { ConfidenceMark, distinctTexts, EmptyState, ExpandButton, FilterChips, plural, SeverityBadge, useExpanded } from './ui';

type SevFilter = 'all' | Severity;
type AreaFilter = 'all' | Area;

const KIND_LABEL: Record<string, string> = {
  tag: 'Tag',
  trigger: 'Trigger',
  variable: 'Variable',
  template: 'Template',
  event: 'Event',
  parameter: 'Parameter',
  'custom-event': 'Custom event',
  'measurement-id': 'Measurement ID',
  container: 'Container',
};

export function Risks({ b, focusRule }: { b: AuditBundle; focusRule?: string }) {
  const [sev, setSev] = useState<SevFilter>('all');
  const [area, setArea] = useState<AreaFilter>('all');
  const { isOpen, toggle, setOpen } = useExpanded();
  const issues = b.result.issues;

  // Arriving from a link like #risks/RSK-01: open that issue and bring it into view.
  useEffect(() => {
    if (!focusRule) return;
    const match = issues.filter((i) => i.ruleId === focusRule).map((i) => `${i.ruleId}-${i.severity}`);
    if (!match.length) return;
    setSev('all');
    setArea('all');
    setOpen(new Set(match));
    requestAnimationFrame(() => {
      const el = document.getElementById(`issue-${match[0]}`);
      el?.scrollIntoView({ block: 'start' });
      el?.querySelector<HTMLElement>('button.expand')?.focus({ preventScroll: true });
    });
  }, [focusRule, issues, setOpen]);

  const filtered = useMemo(() => issues.filter((i) => (sev === 'all' || i.severity === sev) && (area === 'all' || i.area === area)), [issues, sev, area]);
  const countSev = (s: Severity) => issues.filter((i) => i.severity === s).length;
  const countArea = (a: Area) => issues.filter((i) => i.area === a).length;

  return (
    <div className="stack">
      <div className="stack-sm">
        <FilterChips<SevFilter>
          label="Severity"
          value={sev}
          onChange={setSev}
          options={[
            { value: 'all', label: 'All', count: issues.length },
            { value: 'critical', label: 'Critical', count: countSev('critical') },
            { value: 'warning', label: 'Warning', count: countSev('warning') },
            { value: 'housekeeping', label: 'Housekeeping', count: countSev('housekeeping') },
          ]}
        />
        <FilterChips<AreaFilter>
          label="Area"
          value={area}
          onChange={setArea}
          options={[{ value: 'all', label: 'All areas' }, ...AREAS.filter((a) => countArea(a.id)).map((a) => ({ value: a.id, label: a.label, count: countArea(a.id) }))]}
        />
      </div>

      <p className="note">
        Issues are grouped by rule. <strong style={{ fontWeight: 500 }}>Definite</strong> means the container file proves it.{' '}
        <strong style={{ fontWeight: 500 }}>Check in Preview</strong> means it&rsquo;s likely, but depends on how the site behaves, so confirm it in GTM Preview before acting.
      </p>

      {filtered.length === 0 ? (
        <EmptyState title={issues.length ? 'No issues match these filters.' : 'No issues found.'}>
          {issues.length ? 'Try All.' : 'Every rule ran and found nothing to report.'}
        </EmptyState>
      ) : (
        <div>
          {filtered.map((i) => (
            <Issue key={`${i.ruleId}-${i.severity}`} issue={i} open={isOpen(`${i.ruleId}-${i.severity}`)} onToggle={() => toggle(`${i.ruleId}-${i.severity}`)} />
          ))}
        </div>
      )}

      {b.result.rulesSkipped.length > 0 && (
        <p className="note">
          Not run on this container: {b.result.rulesSkipped.map((s) => `${s.id} (${s.reason})`).join(' ')}
        </p>
      )}
    </div>
  );
}

function Issue({ issue, open, onToggle }: { issue: IssueGroup; open: boolean; onToggle: () => void }) {
  const id = `issue-${issue.ruleId}-${issue.severity}`;
  const first = issue.findings[0]!;
  // Most findings in a group share the rule's text; show per-finding fixes only when they differ.
  const fixes = distinctTexts(issue.findings.map((f) => f.fix));
  const wheres = [...new Map(issue.findings.map((f) => [f.where.path, f.where])).values()];
  return (
    <article id={id} className="panel issue" aria-labelledby={`${id}-t`}>
      <div className="issue-head">
        <ExpandButton expanded={open} onClick={onToggle} controls={`${id}-body`} label={issue.title} />
        <div>
          <h3 id={`${id}-t`} className="issue-title">{issue.title}</h3>
          <div className="issue-sub">
            <SeverityBadge severity={issue.severity} />
            <span className="subtle" style={{ fontSize: 14 }}>{plural(issue.findings.length, 'item')}</span>
            <ConfidenceMark confidence={issue.confidence} />
          </div>
        </div>
      </div>
      <div id={`${id}-body`} className="issue-body stack" hidden={!open}>
        {open && (
          <>
            <div className="facts">
              <div className="stack-sm">
                <h4>Why it matters</h4>
                <p>{first.why}</p>
              </div>
              <div className="stack-sm">
                <h4>How to fix it</h4>
                {fixes.map((f) => <p key={f}>{f}</p>)}
                <div>
                  <span className="label">Where in GTM</span>
                  {wheres.map((w) => (
                    <p key={w.path}>
                      <span className="where-path">{w.path}</span>
                      {w.legacyPath !== w.path && <span className="subtle" style={{ fontSize: 14 }}> (older GTM: {w.legacyPath})</span>}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls)" style={{ maxHeight: 480 }}>
              <table className="table">
                <caption className="visually-hidden">Everything affected by {issue.title}</caption>
                <thead>
                  <tr>
                    <th scope="col">Affected</th>
                    <th scope="col">What we found</th>
                    {issue.findings.some((f) => f.confidence !== issue.findings[0]!.confidence) && <th scope="col">Confidence</th>}
                  </tr>
                </thead>
                <tbody>
                  {issue.findings.map((f) => (
                    <tr key={f.fingerprint} className="main">
                      <td style={{ minWidth: 220 }}>
                        <div className="label">{KIND_LABEL[f.entity.kind] ?? f.entity.kind}</div>
                        <span style={{ color: 'var(--fg)' }} className={f.entity.kind === 'event' || f.entity.kind === 'parameter' || f.entity.kind === 'measurement-id' ? 'mono' : undefined}>{f.entity.name}</span>
                      </td>
                      <td><Highlight text={f.message} /></td>
                      {issue.findings.some((x) => x.confidence !== issue.findings[0]!.confidence) && <td><ConfidenceMark confidence={f.confidence} /></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
