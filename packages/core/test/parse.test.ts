import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildGraph, extractGa4Events, parseContainer, summarise, type ContainerModel } from '../src';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

function load(name: string): ContainerModel {
  const out = parseContainer(fixture(name));
  if (!out.ok) throw new Error(out.error.message);
  return out.model;
}

describe('import validation', () => {
  it('rejects non-JSON with a human message', () => {
    const out = parseContainer('not json {');
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.code).toBe('NOT_JSON');
  });

  it('recognises a GA4 property export', () => {
    const out = parseContainer({ name: 'properties/123456', displayName: 'Site' });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error.code).toBe('GA4_EXPORT');
      expect(out.error.message).toMatch(/GA4 property export, not a GTM container/);
    }
  });

  it('recognises a GTM API container record', () => {
    const out = parseContainer({ publicId: 'GTM-X', containerId: '1' });
    expect(!out.ok && out.error.code).toBe('GTM_API_RESOURCE');
  });

  it('accepts a minimal export with no entities', () => {
    const out = parseContainer({ exportFormatVersion: 2, containerVersion: { container: { publicId: 'GTM-EMPTY', usageContext: ['WEB'] } } });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.model.tags).toEqual([]);
  });

  it('rejects server and other non-web containers with a plain explanation', () => {
    for (const usage of ['SERVER', 'AMP', 'ANDROID']) {
      const out = parseContainer({ containerVersion: { container: { publicId: 'GTM-S', usageContext: [usage] } } });
      expect(out.ok).toBe(false);
      if (!out.ok) {
        expect(out.error.code).toBe('NOT_WEB_CONTAINER');
        expect(out.error.message).toMatch(/only checks web containers/);
      }
    }
  });

  it('tolerates a BOM', () => {
    const out = parseContainer('﻿' + fixture('synthetic-legacy.json'));
    expect(out.ok).toBe(true);
  });
});

describe('synthetic legacy container', () => {
  const m = load('synthetic-legacy.json');
  const g = buildGraph(m);

  it('reads container meta', () => {
    expect(m.meta.publicId).toBe('GTM-SYNTH01');
    expect(m.meta.accountId).toBe('111');
    expect(m.meta.usageContext).toBe('web');
  });

  it('counts match the file, with built-in triggers synthesised separately', () => {
    const s = summarise(m);
    expect(s.counts.tags).toBe(11);
    expect(s.counts.triggers).toBe(8);
    expect(s.counts.variables).toBe(6);
    expect(s.counts.folders).toBe(1);
    expect(s.counts.templates).toBe(2);
    expect(s.counts.pausedTags).toBe(1);
    const allPages = m.triggers.find((t) => t.id === '2147479553');
    expect(allPages?.builtIn).toBe(true);
    expect(allPages?.name).toBe('All Pages');
  });

  it('captures unknown types without dropping the entity', () => {
    const tag = m.tags.find((t) => t.id === '9')!;
    expect(tag.type.recognised).toBe(false);
    expect(tag.type.label).toBe('Not recognised yet');
    expect(tag.params.whatever).toBe('x');
    const v = m.variables.find((x) => x.id === '35')!;
    expect(v.type.recognised).toBe(false);
    expect(m.diagnostics.filter((d) => d.code === 'UNKNOWN_TYPE').map((d) => d.detail?.typeKey).sort()).toEqual(['zzfuture', 'zzvar']);
  });

  it('keeps unknown containerVersion keys verbatim and surveys them', () => {
    expect(m.extraContainerVersion.zzFutureSettings).toEqual({ note: 'stands in for an unmodelled 2026 key' });
    expect(m.unknownKeys.containerVersion).toEqual({ zzFutureSettings: 1 });
  });

  it('resolves gallery templates and their permissions', () => {
    const tag = m.tags.find((t) => t.id === '8')!;
    expect(tag.type.recognised).toBe(true);
    expect(tag.type.template?.gallery?.owner).toBe('stape-io');
    expect(tag.type.template?.permissions).toEqual(['inject_script', 'send_pixel']);
    expect(tag.consent).toEqual({ status: 'NEEDED', types: ['ad_storage'] });
  });

  it('resolves gallery templates referenced by galleryTemplateId (cvt_MQDKZ shape)', () => {
    const tag = m.tags.find((t) => t.id === '21')!;
    expect(tag.type.recognised).toBe(true);
    expect(tag.type.template?.name).toBe('Microsoft Clarity - Official');
    expect(m.diagnostics.some((d) => d.code === 'UNRESOLVED_TEMPLATE')).toBe(false);
  });

  it('classifies variable references', () => {
    const html = m.tags.find((t) => t.id === '7')!;
    const byName = Object.fromEntries(html.varRefs.map((r) => [r.name, r.resolution.kind]));
    expect(byName['DLV - missing']).toBe('missing');
    expect(byName['Click URL']).toBe('builtin-disabled');
    const ce = m.triggers.find((t) => t.id === '10')!;
    expect(ce.varRefs[0]).toMatchObject({ name: '_event', path: 'customEventFilter[0].arg0' });
    expect(ce.varRefs[0]!.resolution.kind).toBe('builtin-enabled');
  });

  it('reports dangling links by ID', () => {
    const codes = m.diagnostics.map((d) => `${d.code}:${String(d.detail?.triggerId ?? d.detail?.tagName ?? '')}`);
    expect(codes).toContain('DANGLING_TRIGGER:99999');
    expect(codes).toContain('DANGLING_TAG_REF:Tag That Was Deleted');
  });

  it('parses trigger conditions including negate and ignore_case', () => {
    const t = m.triggers.find((x) => x.id === '12')!;
    expect(t.filters[1]).toEqual({ operator: 'EQUALS', left: '{{Page Path}}', right: '/admin', negate: true, ignoreCase: false });
    expect(t.checkValidation).toBe(false);
    expect(m.triggers.find((x) => x.id === '13')!.customEventFilters[0]!.ignoreCase).toBe(true);
  });

  it('treats trigger-group members as used, and finds the genuinely unused trigger', () => {
    expect(m.triggers.find((t) => t.id === '14')!.groupTriggerIds).toEqual(['15', '16']);
    expect(g.unusedTriggerIds).toEqual(['17']);
    expect(g.tagsByTrigger.get('13')).toEqual({ firing: [], blocking: ['2'] });
  });

  it('finds unused variables but not ones used by other variables', () => {
    expect(g.unusedVariableIds).toContain('34');
    expect(g.unusedVariableIds).not.toContain('33'); // used by the gtes variable
    expect(g.unusedVariableIds).toContain('35');
  });

  it('flags things that might be 2026 output instead of ignoring them', () => {
    expect(m.state.unexplainedSignals).toEqual([
      'Unrecognised tag type "zzfuture"',
      'Unmodelled container key "zzFutureSettings"',
    ]);
  });

  it('detects legacy state, provisionally', () => {
    expect(m.state.state).toBe('Legacy');
    expect(m.state.provisional).toBe(true);
    expect(m.state.legacySignals.join(' ')).toMatch(/googtag/);
  });
});

describe('GA4 event map', () => {
  const m = load('synthetic-legacy.json');
  const events = extractGa4Events(m, buildGraph(m));

  it('groups by event name, not by tag', () => {
    expect(events.map((e) => e.name)).toEqual(['generate_lead', 'scroll_depth']);
    expect(events[0]!.sends.map((s) => s.tagId)).toEqual(['2', '3']);
  });

  it('resolves measurement IDs through constants and old config tags', () => {
    const [lead, scroll] = events;
    expect(lead!.sends[0]!.measurementIdRaw).toBe('{{Const - GA4 ID}}');
    expect(lead!.sends[0]!.measurementId).toBe('G-TEST123');
    expect(scroll!.sends[0]!.measurementId).toBe('G-OLD999');
  });

  it('merges Google tag shared settings, Event Settings variable and tag rows, tag winning', () => {
    const send = events[0]!.sends[0]!;
    const params = Object.fromEntries(send.params.map((p) => [p.name, p]));
    expect(Object.keys(params).sort()).toEqual(['form_id', 'page_location', 'site_section']);
    expect(params.site_section!.value).toBe('contact');
    expect(params.site_section!.origin).toBe('tag');
    expect(params.form_id!.source).toMatchObject({ kind: 'data-layer', variableName: 'DLV - form_id', detail: 'form.id' });
    expect(params.page_location!.source).toMatchObject({ kind: 'built-in', variableName: 'Page URL' });
    const overridden = send.allParamLayers.filter((p) => p.name === 'site_section' && p.overriddenBy);
    expect(overridden.map((p) => p.origin)).toEqual(['google-tag-shared', 'event-settings-variable']);
    expect(send.userProperties.map((u) => u.name)).toEqual(['customer_tier']);
  });

  it('shows the second sender with a different parameter set', () => {
    const footer = events[0]!.sends[1]!;
    expect(footer.params.map((p) => p.name).sort()).toEqual(['formName', 'site_section']);
  });
});

describe('malformed input never crashes the parse', () => {
  it('keeps going past null entries, missing IDs and non-array parameters', () => {
    const out = parseContainer({
      containerVersion: {
        container: { publicId: 'GTM-BAD' },
        tag: [
          null,
          { name: 'no id', type: 'html' },
          { tagId: '1', name: 'object params', type: 'html', parameter: { key: 'html' }, firingTriggerId: 'not-an-array' },
          { tagId: '2', name: 'fine', type: 'gaawe', parameter: [null, { type: 'TEMPLATE', key: 'eventName', value: 'ok' }] },
        ],
        trigger: [{ triggerId: '5', type: 'CUSTOM_EVENT', customEventFilter: [{ type: 'EQUALS' }] }],
        variable: 'nope',
      },
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.model.tags.map((t) => t.id)).toEqual(['1', '2']);
    expect(out.model.tags[1]!.params.eventName).toBe('ok');
    expect(out.model.diagnostics.some((d) => d.code === 'MALFORMED_ENTITY')).toBe(true);
    expect(out.model.triggers[0]!.customEventFilters[0]).toMatchObject({ operator: 'EQUALS', left: '', right: '' });
  });
});
