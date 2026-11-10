'use client';

import type { ImportError } from '@gtm-audit/core';
import { useState } from 'react';
import { ExportHowTo } from './ExportHowTo';

export function Upload({ onFile, error, busy }: { onFile: (f: File) => void; error: ImportError | null; busy: boolean }) {
  const [over, setOver] = useState(false);

  return (
    <main id="main" className="wrap page-enter">
      <div className="hero stack">
        <h1 className="display-page">Get your Google Tag Manager into shape.</h1>
        <p className="lead">
          Drop in your GTM container. You&rsquo;ll get an overview of what&rsquo;s inside, a map of every GA4 event and
          parameter, and a prioritized list of what might need to be fixed.
        </p>
      </div>

      <div className="upload-grid">
      <div className="stack">
        <label
          className={`drop${over ? ' is-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files[0];
            if (f) onFile(f);
          }}
        >
          <span className="label-caps">Container export (.json)</span>
          <span className="drop-title">{busy ? 'Reading the container…' : 'Drop the file here, or click to browse'}</span>
          <span className="muted" style={{ fontSize: 15 }}>
            Not sure where to find it? The steps are alongside.
          </span>
          <input
            type="file"
            accept=".json,application/json"
            aria-describedby="privacy-note"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = '';
            }}
          />
        </label>

        <p id="privacy-note" className="note">
          The file is read in this browser. Nothing is uploaded or stored.
        </p>

        {error && (
          <div className="alert" role="alert">
            <strong>We can&rsquo;t read this file.</strong> {error.message}
          </div>
        )}
      </div>
      <ExportHowTo />
      </div>
    </main>
  );
}
