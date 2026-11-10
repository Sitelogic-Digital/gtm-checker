import { describe, expect, it } from 'vitest';
import { GA4_01 } from '../src/rules/catalog/ga4-01-event-name';
import { GA4_02 } from '../src/rules/catalog/ga4-02-param-count';
import { GA4_03 } from '../src/rules/catalog/ga4-03-param-name';
import { GA4_04 } from '../src/rules/catalog/ga4-04-reserved-event';
import { GA4_05 } from '../src/rules/catalog/ga4-05-ecommerce';
import { GA4_07 } from '../src/rules/catalog/ga4-07-pii';
import { GA4_08 } from '../src/rules/catalog/ga4-08-inconsistent-params';
import { GA4_09 } from '../src/rules/catalog/ga4-09-near-duplicate-params';
import { GA4_10 } from '../src/rules/catalog/ga4-10-recommended-event';
import { GA4_11 } from '../src/rules/catalog/ga4-11-hardcoded-measurement-id';
import { constant, container, dataLayerVar, ga4Event, googleTag, run, settings, tpl, variable } from './builders';

const many = (n: number, prefix = 'p') => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${prefix}_${i}`, 'x']));

describe('GA4-01 event name that breaks the naming rules', () => {
  it('fires on names that are too long, start badly or contain spaces', () => {
    const f = run(GA4_01, container({ tags: [ga4Event('Lead Form Submitted From The Contact Page Footer'), ga4Event('1st_click')] }));
    expect(f).toHaveLength(2);
    expect(f.find((x) => x.detail.eventName === '1st_click')!.message).toMatch(/starts with something other than a letter/);
    expect(f.find((x) => x.detail.eventName !== '1st_click')!.message).toMatch(/characters long.*spaces/);
    // Over the length limit is a documented failure; a bad first character only breaks the naming rules.
    expect(f.find((x) => x.detail.eventName === '1st_click')!.severity).toBe('warning');
    expect(f.find((x) => x.detail.eventName !== '1st_click')!.severity).toBe('critical');
  });
  it('stays quiet on valid, dynamic and paused names', () => {
    const f = run(GA4_01, container({ tags: [ga4Event('generate_lead'), ga4Event('{{Event}}'), ga4Event('bad name', {}, { paused: true })] }));
    expect(f).toEqual([]);
  });
});

describe('GA4-02 more than 25 parameters', () => {
  it('fires when tag rows plus the Event Settings variable exceed 25', () => {
    const gtes = variable('gtes', 'GTES - Shared', [settings('eventSettingsTable', many(6, 'shared'))]);
    const f = run(GA4_02, container({ tags: [ga4Event('big', many(20), { settingsVariable: 'GTES - Shared' })], variables: [gtes] }));
    expect(f).toHaveLength(1);
    expect(f[0]!.message).toMatch(/26 parameters.*20 on the tag, 6 from the Event Settings variable/);
  });
  it('stays quiet at exactly 25', () => {
    expect(run(GA4_02, container({ tags: [ga4Event('ok', many(25))] }))).toEqual([]);
  });
});

describe('GA4-03 parameter or user property name that breaks the rules', () => {
  it('fires on hyphens, reserved prefixes and long user property names', () => {
    const f = run(GA4_03, container({
      tags: [ga4Event('e', { 'form-name': 'x', ga_custom: 'y' }, { userProperties: { customer_lifetime_value_tier: 'z' } })],
    }));
    expect(f.map((x) => x.detail.name).sort()).toEqual(['customer_lifetime_value_tier', 'form-name', 'ga_custom']);
    const sev = Object.fromEntries(f.map((x) => [x.detail.name, x.severity]));
    expect(sev).toEqual({ customer_lifetime_value_tier: 'critical', ga_custom: 'critical', 'form-name': 'warning' });
  });
  it('reports a bad name in a shared Event Settings variable once, against the variable', () => {
    const gtes = variable('gtes', 'GTES - Shared', [settings('eventSettingsTable', { 'bad name': 'x' })], '77');
    const f = run(GA4_03, container({
      tags: [ga4Event('a', {}, { settingsVariable: 'GTES - Shared' }), ga4Event('b', {}, { settingsVariable: 'GTES - Shared' })],
      variables: [gtes],
    }));
    expect(f).toHaveLength(1);
    expect(f[0]!.entity).toEqual({ kind: 'variable', id: '77', name: 'GTES - Shared' });
    expect(f[0]!.where.path).toBe('Advanced → Variables');
  });
  it('stays quiet on valid names', () => {
    expect(run(GA4_03, container({ tags: [ga4Event('e', { form_name: 'x' }, { userProperties: { tier: 'a' } })] }))).toEqual([]);
  });
});

describe('GA4-04 reserved event name', () => {
  it('is critical for names GA4 rejects and reserved prefixes', () => {
    const f = run(GA4_04, container({ tags: [ga4Event('session_start'), ga4Event('google_thing')] }));
    expect(f.map((x) => x.severity)).toEqual(['critical', 'critical']);
  });
  it('is a check-in-preview warning for enhanced measurement names', () => {
    const [f] = run(GA4_04, container({ tags: [ga4Event('scroll')] }));
    expect(f).toMatchObject({ severity: 'warning', confidence: 'check-in-preview' });
  });
  it('allows page_view and ordinary names', () => {
    expect(run(GA4_04, container({ tags: [ga4Event('page_view'), ga4Event('generate_lead')] }))).toEqual([]);
  });
});

describe('GA4-05 purchase and value fields', () => {
  it('fires on purchase without transaction_id or items, and value without currency', () => {
    const f = run(GA4_05, container({ tags: [ga4Event('purchase', { value: '10' })] }));
    expect(f.map((x) => x.message)).toEqual([
      expect.stringMatching(/doesn't send transaction_id or items/),
      expect.stringMatching(/value .* but no currency/),
    ]);
  });
  it('stays quiet when ecommerce data comes from the data layer, or everything is present', () => {
    const f = run(GA4_05, container({
      tags: [
        ga4Event('purchase', {}, { ecommerce: true }),
        ga4Event('purchase', { transaction_id: '1', items: '{{items}}', value: '1', currency: 'GBP' }),
      ],
    }));
    expect(f).toEqual([]);
  });
});

describe('GA4-07 parameter that looks like personal data', () => {
  it('fires on PII-looking names and data layer keys', () => {
    const f = run(GA4_07, container({
      tags: [ga4Event('e', { user_email: 'x', contact: '{{DLV - form email}}' })],
      variables: [dataLayerVar('DLV - form email', 'form.email')],
    }));
    expect(f.map((x) => x.detail.name).sort()).toEqual(['contact', 'user_email']);
    expect(f[0]!.confidence).toBe('check-in-preview');
  });
  it('stays quiet on non-personal names and flags such as email_domain', () => {
    expect(run(GA4_07, container({ tags: [ga4Event('e', { form_name: 'x', email_domain: 'y', has_email: 'z' })] }))).toEqual([]);
  });
  it('stays quiet for a phone parameter that records the clicked tel: link ({{Click URL}})', () => {
    expect(run(GA4_07, container({ tags: [ga4Event('click_to_call', { Phone: '{{Click URL}}' })] }))).toEqual([]);
  });
  it('still flags a phone parameter fed from the data layer', () => {
    expect(run(GA4_07, container({ tags: [ga4Event('lead', { phone: '{{DLV - phone}}' })] }))).toHaveLength(1);
  });
});

describe('GA4-08 same event, different parameters', () => {
  it('fires when two active tags send the same event with different parameters', () => {
    const [f] = run(GA4_08, container({ tags: [ga4Event('generate_lead', { form_id: 'a' }), ga4Event('generate_lead', { form_name: 'b' })] }));
    expect(f!.entity).toMatchObject({ kind: 'event', id: 'generate_lead' });
    expect(f!.message).toMatch(/"form_id" is missing/);
  });
  it('stays quiet when parameters match, or the odd one out is paused', () => {
    expect(run(GA4_08, container({ tags: [ga4Event('x', { a: '1' }), ga4Event('x', { a: '2' })] }))).toEqual([]);
    expect(run(GA4_08, container({ tags: [ga4Event('x', { a: '1' }), ga4Event('x', { b: '2' }, { paused: true })] }))).toEqual([]);
  });
});

describe('GA4-09 near-duplicate parameter names', () => {
  it('fires on form_name vs formName across events', () => {
    const [f] = run(GA4_09, container({ tags: [ga4Event('a', { form_name: 'x' }), ga4Event('b', { formName: 'y' })] }));
    expect(f!.message).toMatch(/"formName" \(b\), "form_name" \(a\)/);
  });
  it('stays quiet when spelling is consistent', () => {
    expect(run(GA4_09, container({ tags: [ga4Event('a', { form_name: 'x' }), ga4Event('b', { form_name: 'y' })] }))).toEqual([]);
  });
});

describe('GA4-10 custom event duplicating a recommended event', () => {
  it('fires on synonyms and on recommended names with the wrong casing', () => {
    const f = run(GA4_10, container({ tags: [ga4Event('lead_submit'), ga4Event('addToCart')] }));
    expect(f.map((x) => x.detail.recommended).sort()).toEqual(['add_to_cart', 'generate_lead']);
  });
  it('stays quiet on recommended and unrelated names', () => {
    expect(run(GA4_10, container({ tags: [ga4Event('generate_lead'), ga4Event('login'), ga4Event('brochure_download')] }))).toEqual([]);
  });
});

describe('GA4-11 measurement ID typed into several tags', () => {
  it('fires when the same G- ID is typed into two or more tags', () => {
    const [f] = run(GA4_11, container({ tags: [googleTag('G-ABC123'), ga4Event('a', {}, { mid: 'G-ABC123' })] }));
    expect(f!.entity).toMatchObject({ kind: 'measurement-id', id: 'G-ABC123' });
  });
  it('stays quiet when tags use a Constant variable', () => {
    const f = run(GA4_11, container({
      tags: [googleTag('{{GA4 ID}}'), ga4Event('a', {}, { mid: '{{GA4 ID}}' }), ga4Event('b', {}, { mid: '{{GA4 ID}}' })],
      variables: [constant('GA4 ID', 'G-ABC123')],
    }));
    expect(f).toEqual([]);
  });
});

it('tpl helper builds TEMPLATE nodes', () => expect(tpl('a', 'b')).toEqual({ type: 'TEMPLATE', key: 'a', value: 'b' }));
