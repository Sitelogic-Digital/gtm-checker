/**
 * Phase 0 debug tool.
 *
 *   pnpm inspect <export.json> [more.json ...]   summary per file
 *   pnpm inspect --survey <files...>              unknown keys + type keys across all files
 *   pnpm inspect --json <export.json>             full summary as JSON
 *
 * Prints structure only (counts, type keys, key names). It never prints
 * parameter values, so it's safe to run on client containers.
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { audit, parseContainer, summarise } from '../src/index';

const args = process.argv.slice(2);
const surveyMode = args.includes('--survey');
const jsonMode = args.includes('--json');
const auditMode = args.includes('--audit');
const files = args.filter((a) => !a.startsWith('--'));

if (!files.length) {
  console.error('Usage: pnpm inspect [--survey|--json] <export.json> [...]');
  process.exit(1);
}

const survey: Record<string, Record<string, Set<string>>> = {};
const typeKeys: Record<string, Map<string, Set<string>>> = { tag: new Map(), trigger: new Map(), variable: new Map() };

for (const file of files) {
  const name = basename(file);
  const outcome = parseContainer(readFileSync(file, 'utf8'));
  if (!outcome.ok) {
    console.log(`\n✗ ${name}\n  ${outcome.error.code}: ${outcome.error.message}`);
    continue;
  }
  const m = outcome.model;
  const s = summarise(m);

  if (jsonMode) {
    console.log(JSON.stringify(s, null, 2));
    continue;
  }

  if (auditMode) {
    // Prints entity names and finding messages: client data. Local use only.
    const r = audit(m);
    console.log(`\n${name}: ${r.state}, ${r.rulesRun.length} rules run`);
    for (const s of ['critical', 'warning', 'housekeeping', 'info'] as const) {
      console.log(`  ${s}: ${r.counts[s].issues} issues, ${r.counts[s].findings} findings`);
    }
    if (r.rulesSkipped.length) console.log(`  skipped: ${r.rulesSkipped.map((x) => x.id).join(', ')}`);
    if (r.ruleErrors.length) console.log(`  RULE ERRORS: ${JSON.stringify(r.ruleErrors)}`);
    for (const i of r.issues) {
      console.log(`\n  [${i.severity.toUpperCase()}] ${i.ruleId} ${i.title}  (${i.findings.length}, ${i.confidence})`);
      for (const f of i.findings.slice(0, 4)) console.log(`    - ${f.entity.name}: ${f.message}`);
      if (i.findings.length > 4) console.log(`    … ${i.findings.length - 4} more`);
    }
    continue;
  }

  if (surveyMode) {
    for (const [loc, keys] of Object.entries(m.unknownKeys)) {
      for (const k of Object.keys(keys)) ((survey[loc] ??= {})[k] ??= new Set()).add(name);
    }
    for (const e of [...m.tags, ...m.triggers, ...m.variables]) {
      const map = typeKeys[e.kind]!;
      if (!map.has(e.type.key)) map.set(e.type.key, new Set());
      map.get(e.type.key)!.add(name);
    }
    continue;
  }

  console.log(`\n${name}`);
  console.log(`  ${s.publicId} "${s.containerName}"  version ${s.versionId ?? '?'}  exported ${s.exportTime ?? '?'}  (${s.usageContext})`);
  console.log(`  State: ${s.state}${s.stateProvisional ? ' (provisional: 2026 signals not yet confirmed)' : ''}`);
  if (m.state.legacySignals.length) console.log(`    legacy:    ${m.state.legacySignals.join('; ')}`);
  if (m.state.optimizedSignals.length) console.log(`    optimized: ${m.state.optimizedSignals.join('; ')}`);
  if (m.state.unexplainedSignals.length) console.log(`    UNEXPLAINED (possible 2026 output, please keep this file): ${m.state.unexplainedSignals.join('; ')}`);
  const c = s.counts;
  console.log(`  Tags ${c.tags} (${c.pausedTags} paused) · Triggers ${c.triggers} · Variables ${c.variables} · Folders ${c.folders} (+ Unfiled Items: ${c.unfiledItems}) · Templates ${c.templates} · Built-ins enabled ${c.builtInVariablesEnabled}`);
  console.log(`  Tag types: ${Object.entries(s.tagTypes).map(([k, n]) => `${k}×${n}`).join(', ') || 'none'}`);
  console.log(`  GA4: ${s.ga4.events} event names → ${s.ga4.measurementIds.join(', ') || 'no resolved measurement IDs'}`);
  console.log(`  Unused: ${s.unusedTriggers} triggers, ${s.unusedVariables} variables`);
  if (s.unrecognisedTypes.length) console.log(`  Not recognised yet: ${s.unrecognisedTypes.map((u) => `${u.kind}:${u.typeKey}×${u.count}`).join(', ')}`);
  if (s.missingVariableRefs.length) console.log(`  Missing/disabled variable refs: ${s.missingVariableRefs.length}`);
  if (Object.keys(s.diagnostics).length) console.log(`  Diagnostics: ${Object.entries(s.diagnostics).map(([k, n]) => `${k}×${n}`).join(', ')}`);
  const extra = Object.keys(m.extraContainerVersion);
  if (extra.length) console.log(`  Unmodelled containerVersion keys: ${extra.join(', ')}`);
}

if (surveyMode) {
  console.log('\nUnknown keys (location → key → files)');
  for (const [loc, keys] of Object.entries(survey)) {
    console.log(`  ${loc}`);
    for (const [k, fs] of Object.entries(keys)) console.log(`    ${k}  [${[...fs].join(', ')}]`);
  }
  console.log('\nType keys seen (kind → key → files)');
  for (const [kind, map] of Object.entries(typeKeys)) {
    console.log(`  ${kind}`);
    for (const [k, fs] of [...map.entries()].sort()) console.log(`    ${k}  [${[...fs].join(', ')}]`);
  }
}
