'use client';

/**
 * The whole Phase 1 app runs in the browser: parse, audit and render.
 * Nothing leaves the machine until there's a "Save audit" step (not built yet).
 * Views are hash-routed (#overview, #events, #triggers, #risks/RULE-ID) so links,
 * the back button and keyboard focus all behave like real pages.
 */
import type { ImportError } from '@gtm-audit/core';
import { useCallback, useEffect, useState } from 'react';
import { EventMap } from '../components/EventMap';
import { Overview } from '../components/Overview';
import { Risks } from '../components/Risks';
import { Triggers } from '../components/Triggers';
import { ThemeToggle } from '../components/ThemeToggle';
import { Upload } from '../components/Upload';
import { buildAudit, formatExportTime, type AuditBundle } from '../lib/audit';

type View = 'overview' | 'events' | 'triggers' | 'risks';
const VIEWS: Array<{ id: View; label: string; title: string }> = [
  { id: 'overview', label: 'Overview', title: 'Overview' },
  { id: 'events', label: 'GA4 Event Map', title: 'GA4 Event Map' },
  { id: 'triggers', label: 'Triggers', title: 'Triggers' },
  { id: 'risks', label: 'Risks', title: 'Risks' },
];

function readHash(): { view: View; rule?: string } {
  const [v, rule] = (typeof window === 'undefined' ? '' : window.location.hash.slice(1)).split('/');
  return { view: (VIEWS.some((x) => x.id === v) ? v : 'overview') as View, rule };
}

export default function Page() {
  const [bundle, setBundle] = useState<AuditBundle | null>(null);
  const [error, setError] = useState<ImportError | null>(null);
  const [busy, setBusy] = useState(false);
  const [route, setRoute] = useState<{ view: View; rule?: string }>({ view: 'overview' });

  useEffect(() => {
    const on = () => setRoute(readHash());
    on();
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  // Move focus to the view heading when a container loads or the view changes, so screen readers
  // announce the new page. A deep link to a rule (#risks/RSK-01) lets Risks focus that issue instead.
  useEffect(() => {
    if (bundle && !route.rule) document.getElementById('view-title')?.focus();
  }, [bundle, route.view, route.rule]);

  useEffect(() => {
    const v = VIEWS.find((x) => x.id === route.view);
    document.title = bundle ? `${v?.title} · ${bundle.model.meta.publicId} · GTM Auditor` : 'GTM Auditor';
  }, [bundle, route.view]);

  const onFile = useCallback(async (f: File) => {
    setBusy(true);
    setError(null);
    try {
      const out = buildAudit(f.name, await f.text());
      if (!out.ok) {
        setError(out.error);
        return;
      }
      setBundle(out.bundle);
      window.location.hash = 'overview';
    } finally {
      setBusy(false);
    }
  }, []);

  const reset = () => {
    setBundle(null);
    setError(null);
    history.replaceState(null, '', window.location.pathname);
  };

  if (!bundle) return (
    <>
      <AppHeader />
      <Upload onFile={onFile} error={error} busy={busy} />
    </>
  );

  const m = bundle.model;
  const current = VIEWS.find((v) => v.id === route.view)!;
  const counts: Partial<Record<View, number>> = {
    events: bundle.events.length,
    triggers: m.triggers.filter((t) => !t.builtIn).length,
    risks: bundle.result.issues.filter((i) => i.severity !== 'info').length,
  };

  return (
    <>
      <AppHeader>
        <nav className="nav" aria-label="Audit sections">
          {VIEWS.map((v) => (
            <a key={v.id} href={`#${v.id}`} aria-current={route.view === v.id ? 'page' : undefined}>
              {v.label}
              {counts[v.id] !== undefined && <span className="count">{counts[v.id]}</span>}
            </a>
          ))}
        </nav>
      </AppHeader>
      <main id="main" className="wrap page-enter" key={route.view} style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-24)' }}>
        <div className="stack-lg">
          <div className="stack-sm">
            <p className="eyebrow">
              {m.meta.containerName && m.meta.containerName !== m.meta.publicId ? `${m.meta.containerName} · ` : ''}
              {m.meta.publicId}
            </p>
            <h1 id="view-title" tabIndex={-1} className="h2" style={{ outline: 'none' }}>{current.title}</h1>
          </div>
          {route.view === 'overview' && <Overview b={bundle} />}
          {route.view === 'events' && <EventMap b={bundle} />}
          {route.view === 'triggers' && <Triggers b={bundle} />}
          {route.view === 'risks' && <Risks b={bundle} focusRule={route.rule} />}
          <footer className="page-foot stack">
            <p className="note">
              <span className="label">About this export</span>{' '}
              {m.meta.versionId === '0' ? 'Workspace export (not a published version)' : `Version ${m.meta.versionId ?? 'unknown'}`}, exported{' '}
              {formatExportTime(m.meta.exportTime)}. Container type: {m.state.state}
              {m.state.provisional
                ? ' (detected from the export; Google\u2019s 2026 container changes aren\u2019t fully mapped yet, so treat this label as provisional).'
                : '.'}
            </p>
            <button type="button" className="sl-ulink link-button" onClick={reset}>
              Check another container <span className="sl-glyph" aria-hidden="true">→</span>
            </button>
          </footer>
        </div>
      </main>
    </>
  );
}

function AppHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="app-head">
      <a href="#main" className="skip">Skip to content</a>
      <div className="wrap app-head-inner">
        <span className="brand">
          <img className="brand-mark" src="/brand/sitelogic-icon.svg" alt="Sitelogic" width={28} height={28} />
          <span className="label">GTM Auditor</span>
        </span>
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}
