/**
 * Regression run over real client exports in fixtures/private/ (gitignored).
 * Skipped when the folder is empty, e.g. in CI. Asserts structure only.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { audit, parseContainer, summarise } from '../src';

const dir = join(__dirname, '../../../fixtures/private');
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : [];

describe.skipIf(files.length === 0)('private fixtures', () => {
  it.each(files)('%s parses cleanly', (file) => {
    const out = parseContainer(readFileSync(join(dir, file), 'utf8'));
    expect(out.ok, out.ok ? '' : out.error.message).toBe(true);
    if (!out.ok) return;
    const m = out.model;
    expect(m.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
    expect(summarise(m).unrecognisedTypes).toEqual([]);
    expect(m.state.unexplainedSignals).toEqual([]);
    expect(m.meta.publicId).toMatch(/^GTM-/);
    expect(audit(m).ruleErrors).toEqual([]);
  });
});
