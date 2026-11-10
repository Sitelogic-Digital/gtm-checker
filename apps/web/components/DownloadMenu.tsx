'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { AuditBundle } from '../lib/audit';
import { downloadText, eventsCsv, exportFileName, issuesCsv } from '../lib/export';

/**
 * "Download" next to each view title: the printable report, plus spreadsheets for whoever fixes the
 * container. A disclosure (button + list of buttons), not an ARIA menu: simpler and works with every
 * screen reader. Closes on Escape (focus back on the button), an outside click, or a choice.
 */
export function DownloadMenu({ b }: { b: AuditBundle }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="download" ref={wrap}>
      <button ref={trigger} type="button" className="sl-btn sl-btn-sm" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span>Download</span>
        <span className="sl-arrow sl-arrow-down" aria-hidden="true">↓</span>
      </button>
      <ul id={id} className="download-list" hidden={!open}>
        <li>
          <button type="button" onClick={choose(() => window.print())}>
            <span className="download-name">Report</span>
            <span className="download-meta">PDF, via your browser&rsquo;s print dialog</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={choose(() => downloadText(exportFileName(b, 'issues'), issuesCsv(b)))}>
            <span className="download-name">Issues</span>
            <span className="download-meta">Spreadsheet (CSV), one row per finding</span>
          </button>
        </li>
        <li>
          <button type="button" disabled={!b.events.length} onClick={choose(() => downloadText(exportFileName(b, 'ga4-events'), eventsCsv(b)))}>
            <span className="download-name">GA4 events</span>
            <span className="download-meta">{b.events.length ? 'Spreadsheet (CSV), every event and parameter' : 'No GA4 events in this container'}</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
