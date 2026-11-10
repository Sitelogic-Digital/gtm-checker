'use client';

import { SCORE_METHOD, SEVERITY_ORDER, type IssueGroup } from '@gtm-audit/core';
import { formatExportTime, type AuditBundle } from '../lib/audit';
import { Highlight } from './Highlight';
import { SummarySentence } from './SummarySentence';
import { ConfidenceMark, distinctTexts, plural, sentenceShape, SeverityBadge } from './ui';

/** Affected items listed per issue before the report says "and N more". */
const MAX_AFFECTED = 40;

/**
 * The printable client report. Hidden on screen; when the page prints (the
 * "Save as PDF" button or Cmd/Ctrl+P), print CSS hides the app and shows this.
 * It always prints in Bone, whatever theme is on screen: data-theme on the
 * wrapper scopes the Bone tokens to it.
 */
export function Report({ b }: { b: AuditBundle }) {
  const { model, result } = b;
  const issues = result.issues
    .filter((i) => i.severity !== 'info')
    .sort((a, c) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(c.severity) || c.findings.length - a.findings.length);
  const triggerName = (id: string) => model.triggers.find((t) => t.id === id)?.name ?? `Trigger ${id}`;
  const today = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  const exportKind = model.meta.versionId === '0' ? 'Workspace export (not a published version)' : `Version ${model.meta.versionId ?? 'unknown'}`;

  return (
    <div className="report" data-theme="bone">
      <header className="report-cover">
        <div className="report-brand">
          <img src="/brand/sitelogic-icon.svg" alt="" width={24} height={24} />
          <span className="label-caps">GTM container audit</span>
        </div>
        <h1 className="report-title">{model.meta.containerName || model.meta.publicId}</h1>
        <dl className="report-meta">
          <div><dt className="label-caps">Container</dt><dd>{model.meta.publicId}</dd></div>
          <div><dt className="label-caps">Export</dt><dd>{exportKind}, exported {formatExportTime(model.meta.exportTime)}</dd></div>
          <div><dt className="label-caps">Container type</dt><dd>{model.state.state}{model.state.provisional ? ' (provisional)' : ''}</dd></div>
          <div><dt className="label-caps">Report date</dt><dd>{today}</dd></div>
        </dl>
      </header>

      <section className="report-section">
        <h2 className="report-h2">Summary</h2>
        <div className="report-sentences">
          {b.overview.map((s, i) => <p key={i}><SummarySentence s={s} links={false} /></p>)}
        </div>
      </section>

      <section className="report-section">
        <h2 className="report-h2">Health by area</h2>
        <div className="report-scores">
          {b.scores.map((s) => (
            <div key={s.area} className="report-score">
              <span className="label-caps">{s.label}</span>
              {s.score === null ? <span className="report-score-value report-score-none">Not used</span> : <span className="report-score-value">{s.score}<small> / 100</small></span>}
            </div>
          ))}
        </div>
        <p className="report-note">{SCORE_METHOD}</p>
      </section>

      <section className="report-section">
        <h2 className="report-h2">Issues</h2>
        <p className="report-note">
          Grouped by rule, most serious first. <strong>Definite</strong> means the container file proves it. <strong>Check in Preview</strong> means
          it&rsquo;s likely but depends on how the site behaves, so confirm it in GTM Preview before acting.
        </p>
        {issues.length === 0 ? <p>Every rule ran and found nothing to report.</p> : issues.map((i) => <ReportIssue key={`${i.ruleId}-${i.severity}`} issue={i} />)}
        {result.rulesSkipped.length > 0 && (
          <p className="report-note">Not run on this container: {result.rulesSkipped.map((s) => `${s.id} (${s.reason})`).join(' ')}</p>
        )}
      </section>

      {b.events.length > 0 && (
        <section className="report-section report-appendix">
          <h2 className="report-h2">Appendix: GA4 events</h2>
          <p className="report-note">Every GA4 event the container sends, the tags that send it and what makes them fire.</p>
          <table className="report-table">
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">Sent by</th>
                <th scope="col">Fires on</th>
                <th scope="col" className="num">Params</th>
              </tr>
            </thead>
            <tbody>
              {b.events.map((ev) => (
                <tr key={ev.name}>
                  <td className="mono">{ev.name}</td>
                  <td>{ev.sends.map((s) => <div key={s.tagId}>{s.tagName}{s.paused ? ' (paused)' : ''}</div>)}</td>
                  <td>{[...new Set(ev.sends.flatMap((s) => s.firingTriggerIds))].map((id) => <div key={id}>{triggerName(id)}</div>)}</td>
                  <td className="num">{new Set(ev.sends.flatMap((s) => s.params.map((p) => p.name))).size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="report-foot">
        <p>
          Prepared by Sitelogic from a GTM container export. This report describes how the container is set up, not how the site behaves
          for every visitor. Questions about consent or privacy belong with whoever owns your site&rsquo;s consent and privacy policy.
        </p>
      </footer>
    </div>
  );
}

function ReportIssue({ issue }: { issue: IssueGroup }) {
  const first = issue.findings[0]!;
  const fixes = distinctTexts(issue.findings.map((f) => f.fix));
  const wheres = [...new Map(issue.findings.map((f) => [f.where.path, f.where])).values()];
  const shown = issue.findings.slice(0, MAX_AFFECTED);
  const more = issue.findings.length - shown.length;
  return (
    <article className="report-issue">
      <div className="report-issue-head">
        <h3 className="report-h3">{issue.title}</h3>
        <div className="issue-sub">
          <SeverityBadge severity={issue.severity} />
          <span className="subtle">{plural(issue.findings.length, 'item')}</span>
          <ConfidenceMark confidence={issue.confidence} />
        </div>
      </div>
      <div className="report-facts">
        <div>
          <h4 className="label">Why it matters</h4>
          <p>{first.why}</p>
        </div>
        <div>
          <h4 className="label">How to fix it</h4>
          {fixes.map((f) => <p key={f}>{f}</p>)}
          {wheres.map((w) => (
            <p key={w.path} className="report-where">
              In GTM: {w.path}{w.legacyPath !== w.path ? ` (older GTM: ${w.legacyPath})` : ''}
            </p>
          ))}
        </div>
      </div>
      <h4 className="label">Affected</h4>
      {sameMessage(issue) ? (
        <ul className="report-affected report-affected-names">
          {shown.map((f) => <li key={f.fingerprint}><span className="report-entity">{f.entity.name}</span></li>)}
        </ul>
      ) : (
        <ul className="report-affected">
          {shown.map((f) => (
            <li key={f.fingerprint}>
              <span className="report-entity">{f.entity.name}</span> <Highlight text={f.message} />
            </li>
          ))}
        </ul>
      )}
      {more > 0 && <p className="report-note">And {more} more. The full list is in the Risks view of the audit.</p>}
    </article>
  );
}

/**
 * True when every finding says the same thing apart from names and details in
 * quotes or brackets, so the report can list just the affected names.
 */
function sameMessage(issue: IssueGroup): boolean {
  if (issue.findings.length < 2) return false;
  const first = sentenceShape(issue.findings[0]!.message);
  return issue.findings.every((f) => sentenceShape(f.message) === first);
}
