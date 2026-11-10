import { describe, expect, it } from 'vitest';
import { RSK_01 } from '../src/rules/catalog/rsk-01-consent-not-set';
import { RSK_02 } from '../src/rules/catalog/rsk-02-missing-conversion-linker';
import { RSK_03 } from '../src/rules/catalog/rsk-03-linker-after-optimization';
import { RSK_04 } from '../src/rules/catalog/rsk-04-custom-html';
import { RSK_05 } from '../src/rules/catalog/rsk-05-template-permissions';
import { RSK_09 } from '../src/rules/catalog/rsk-09-unused-template';
import { RSK_10 } from '../src/rules/catalog/rsk-10-analytics-consent';
import { RSK_06 } from '../src/rules/catalog/rsk-06-universal-analytics';
import { RSK_07 } from '../src/rules/catalog/rsk-07-missing-variable';
import { RSK_08 } from '../src/rules/catalog/rsk-08-consent-not-needed';
import { TRG_01 } from '../src/rules/catalog/trg-01-page-view-double';
import { TRG_02 } from '../src/rules/catalog/trg-02-regex';
import { TRG_03 } from '../src/rules/catalog/trg-03-unfiltered-click';
import { TRG_04 } from '../src/rules/catalog/trg-04-custom-event-casing';
import { TRG_05 } from '../src/rules/catalog/trg-05-form-validation';
import { TRG_06 } from '../src/rules/catalog/trg-06-unused-trigger';
import { audit, parseContainer } from '../src';
import { ALL_PAGES, cond, container, ga4Event, googleTag, run, tag, template, tpl, trigger, bool, variable } from './builders';

describe('TRG-01 page_view sent more than once', () => {
  it('fires definitively when the Google tag and a page_view tag share a trigger', () => {
    const [f] = run(TRG_01, container({ tags: [googleTag('G-A', { triggers: [ALL_PAGES] }), ga4Event('page_view', {}, { mid: 'G-A' })] }));
    expect(f).toMatchObject({ confidence: 'definite', entity: { kind: 'measurement-id', id: 'G-A' } });
  });
  it('fires when a Google tag re-fires on a custom event without send_page_view false', () => {
    const ce = trigger('CUSTOM_EVENT', { id: '50', name: 'CE - signup', customEvent: 'signup' });
    const [f] = run(TRG_01, container({ tags: [googleTag('G-A'), googleTag('G-A', { id: '9', triggers: ['50'], config: { plan: 'x' } })], triggers: [ce] }));
    expect(f!.entity.id).toBe('9');
    expect(f!.message).toMatch(/fires on "CE - signup"/);
  });
  it('checks a Google tag whose ID comes from a variable (such as a lookup table)', () => {
    const ce = trigger('CUSTOM_EVENT', { id: '53', name: 'CE - signup', customEvent: 'signup' });
    const [f] = run(TRG_01, container({ tags: [googleTag('{{GA4 Lookup}}', { triggers: ['53'] })], triggers: [ce] }));
    expect(f!.message).toMatch(/\{\{GA4 Lookup\}\}.*fires on "CE - signup"/);
  });
  it('stays quiet when the Google tag waits for a consent update event', () => {
    const cu = trigger('CUSTOM_EVENT', { id: '54', name: 'GTM.ConsentUpdate', customEvent: 'cookie_consent_update' });
    expect(run(TRG_01, container({ tags: [googleTag('{{GA4 Lookup}}', { triggers: ['54'] })], triggers: [cu] }))).toEqual([]);
  });
  it('fires when page_view is sent on History Change', () => {
    const hc = trigger('HISTORY_CHANGE', { id: '51' });
    const [f] = run(TRG_01, container({ tags: [ga4Event('page_view', {}, { mid: 'G-A', triggers: ['51'] })], triggers: [hc] }));
    expect(f!.message).toMatch(/History Change/);
  });
  it('stays quiet for one Google tag, and for re-fires with send_page_view false', () => {
    const ce = trigger('CUSTOM_EVENT', { id: '52', customEvent: 'x' });
    const f = run(TRG_01, container({
      tags: [googleTag('G-A'), googleTag('G-A', { triggers: ['52'], config: { send_page_view: 'false' } }), ga4Event('generate_lead', {}, { mid: 'G-A' })],
      triggers: [ce],
    }));
    expect(f).toEqual([]);
  });
});

describe('TRG-02 broken or meaningless regex', () => {
  it('fires on regex that won\'t compile, matches everything, or never matches', () => {
    const t = trigger('PAGEVIEW', {
      filters: [cond('MATCH_REGEX', '{{Page Path}}', '(unclosed'), cond('MATCH_REGEX', '{{Page URL}}', '.*'), cond('MATCH_REGEX', '{{Page Path}}', '^.*$', { negate: true })],
    });
    const f = run(TRG_02, container({ triggers: [t] }));
    const bySev = (re: RegExp) => f.find((x) => re.test(x.message))?.severity;
    expect(f).toHaveLength(3);
    expect(bySev(/won't compile/)).toBe('critical');
    expect(bySev(/never fires/)).toBe('critical');
    expect(bySev(/matches everything/)).toBe('housekeeping');
  });
  it('accepts ".*" in "Enable this trigger when", and treats ".*" in other conditions as housekeeping', () => {
    const timer = { ...trigger('TIMER'), autoEventFilter: [cond('MATCH_REGEX', '{{Page URL}}', '.*')] };
    expect(run(TRG_02, container({ triggers: [timer] }))).toEqual([]);
    const [f] = run(TRG_02, container({ triggers: [trigger('PAGEVIEW', { filters: [cond('MATCH_REGEX', '{{Page URL}}', '.*')] })] }));
    expect(f!.severity).toBe('housekeeping');
  });
  it('accepts ".*" on the event name of a Custom Event trigger (the "any event" exception-trigger pattern)', () => {
    const t = { ...trigger('CUSTOM_EVENT', { filters: [cond('EQUALS', '{{DLV - ad_storage}}', 'denied')] }), customEventFilter: [cond('MATCH_REGEX', '{{_event}}', '.*')] };
    expect(run(TRG_02, container({ triggers: [t] }))).toEqual([]);
  });
  it('accepts valid regex, including lookaheads (web containers run JavaScript regex)', () => {
    const t = trigger('PAGEVIEW', { filters: [cond('MATCH_REGEX', '{{Page Path}}', '^/thank-you'), cond('MATCH_REGEX', '{{Page Path}}', 'event(?!-auth)')] });
    expect(run(TRG_02, container({ triggers: [t] }))).toEqual([]);
  });
});

describe('TRG-03 unconditioned click trigger feeding GA4', () => {
  it('fires on an All Elements trigger sending a GA4 event', () => {
    const t = trigger('CLICK', { id: '60' });
    const [f] = run(TRG_03, container({ triggers: [t], tags: [ga4Event('cta_click', {}, { triggers: ['60'] })] }));
    expect(f!.message).toMatch(/every click on any element.*"cta_click"/);
  });
  it('stays quiet with a condition, or when only non-GA4 tags use it', () => {
    const scoped = trigger('CLICK', { id: '61', filters: [cond('CONTAINS', '{{Click Classes}}', 'cta')] });
    const bare = trigger('LINK_CLICK', { id: '62' });
    const f = run(TRG_03, container({
      triggers: [scoped, bare],
      tags: [ga4Event('cta_click', {}, { triggers: ['61'] }), tag('html', { triggers: ['62'], params: [tpl('html', '<script></script>')] })],
      builtIns: ['Click Classes'],
    }));
    expect(f).toEqual([]);
  });
});

describe('TRG-04 Custom Event triggers differing only in spelling', () => {
  it('fires on form_submit vs formSubmit', () => {
    const [f] = run(TRG_04, container({ triggers: [trigger('CUSTOM_EVENT', { customEvent: 'form_submit' }), trigger('CUSTOM_EVENT', { customEvent: 'formSubmit' })] }));
    expect(f!.related).toHaveLength(2);
  });
  it('stays quiet on genuinely different events', () => {
    expect(run(TRG_04, container({ triggers: [trigger('CUSTOM_EVENT', { customEvent: 'form_submit' }), trigger('CUSTOM_EVENT', { customEvent: 'form_start' })] }))).toEqual([]);
  });
});

describe('TRG-05 Form Submission trigger with Check Validation off', () => {
  it('fires when a used form trigger has validation off', () => {
    const t = trigger('FORM_SUBMISSION', { id: '70', checkValidation: false });
    expect(run(TRG_05, container({ triggers: [t], tags: [ga4Event('generate_lead', {}, { triggers: ['70'] })] }))).toHaveLength(1);
  });
  it('stays quiet with validation on, or when nothing uses the trigger', () => {
    const on = trigger('FORM_SUBMISSION', { id: '71', checkValidation: true });
    const unused = trigger('FORM_SUBMISSION', { id: '72', checkValidation: false });
    expect(run(TRG_05, container({ triggers: [on, unused], tags: [ga4Event('generate_lead', {}, { triggers: ['71'] })] }))).toEqual([]);
  });
});

describe('TRG-06 trigger not used by any tag', () => {
  it('fires on an orphan trigger', () => {
    const [f] = run(TRG_06, container({ triggers: [trigger('CUSTOM_EVENT', { id: '80', customEvent: 'x' })] }));
    expect(f!.entity.id).toBe('80');
  });
  it('treats trigger-group members as used', () => {
    const a = trigger('CUSTOM_EVENT', { id: '81', customEvent: 'a' });
    const g = trigger('TRIGGER_GROUP', { id: '82', groupOf: ['81'] });
    expect(run(TRG_06, container({ triggers: [a, g], tags: [ga4Event('x', {}, { triggers: ['82'] })] }))).toEqual([]);
  });
});

describe('RSK-01 marketing tag with consent not set', () => {
  it('fires on a Custom Image pixel and on Custom HTML loading the Meta pixel', () => {
    const html = tag('html', { consent: 'NOT_SET', params: [tpl('html', '<script src="https://connect.facebook.net/en_US/fbevents.js"></script>')] });
    const f = run(RSK_01, container({ tags: [tag('img', { consent: 'NOT_SET' }), html] }));
    expect(f).toHaveLength(2);
    expect(f.map((x) => x.detail.reason).sort()).toEqual(['Custom HTML loading Meta', 'Custom Image']);
  });
  it('downgrades to check-in-preview when a consent trigger gates the tag', () => {
    const gate = trigger('CUSTOM_EVENT', { id: '90', name: 'CE - cookie_consent_marketing', customEvent: 'cookie_consent_marketing' });
    const [f] = run(RSK_01, container({ triggers: [gate], tags: [tag('img', { consent: 'NOT_SET', triggers: ['90'] })] }));
    expect(f!.confidence).toBe('check-in-preview');
  });
  it('judges template tags by what the template can do and who the vendor is', () => {
    const f = run(RSK_01, container({
      templates: [
        template('20', 'Braze Initialization Tag', [{ id: 'inject_script' }]),
        template('21', 'Braze Actions Tag', [{ id: 'access_globals' }, { id: 'read_data_layer' }]),
        template('22', 'Contentsquare - Main tag', [{ id: 'inject_script' }]),
        template('23', 'Acme Widget', [{ id: 'inject_script' }]),
      ],
      tags: ['20', '21', '21', '22', '23'].map((id) => tag(`cvt_2_${id}`, { consent: 'NOT_SET' })),
    }));
    // Braze init: known marketing vendor that loads code. Actions: can't load anything. Contentsquare: analytics. Acme: unknown, loads code.
    expect(f.map((x) => [x.detail.reason, x.confidence])).toEqual([
      ['Braze Initialization Tag', 'definite'],
      ['Acme Widget, a template that loads third-party code', 'check-in-preview'],
    ]);
  });
  it('is a Warning when a consent-looking blocking trigger holds the tag back', () => {
    const block = { ...trigger('CUSTOM_EVENT', { id: '91', name: 'CE - cookie-update - Advertising Denied', filters: [cond('EQUALS', '{{DLV - ad_storage}}', 'denied')] }), customEventFilter: [cond('MATCH_REGEX', '{{_event}}', '.*')] };
    const [f] = run(RSK_01, container({ triggers: [block], tags: [tag('img', { consent: 'NOT_SET', blocking: ['91'] })] }));
    expect(f).toMatchObject({ severity: 'warning', confidence: 'check-in-preview' });
    expect(f!.message).toMatch(/blocking trigger.*before the visitor has made a choice/);
  });
  it('recognises a StackAdapt pixel in Custom HTML', () => {
    const html = tag('html', { consent: 'NOT_SET', params: [tpl('html', '<script>!function(s,a,e,v,n,t,z){}(window,document,"script","//tags.srv.stackadapt.com/events.js");saq("ts","abc");</script>')] });
    expect(run(RSK_01, container({ tags: [html] }))).toHaveLength(1);
  });
  it('ignores tags with built-in consent checks (Google, Microsoft UET), tags with consent set, and CMP templates', () => {
    const cmp = template('5', 'Cookiebot CMP', []);
    const f = run(RSK_01, container({
      templates: [cmp],
      tags: [tag('awct', { consent: 'NOT_SET' }), tag('baut', { consent: 'NOT_SET' }), tag('img', { consent: 'NEEDED' }), tag('cvt_2_5', { consent: 'NOT_SET', triggers: ['2147479572'] })],
    }));
    expect(f).toEqual([]);
  });
});

describe('RSK-02 Ads conversions without a Conversion Linker (Legacy)', () => {
  it('fires when there is a conversion tag and no linker', () => {
    expect(run(RSK_02, container({ tags: [tag('awct')] }))).toHaveLength(1);
  });
  it('stays quiet with a Conversion Linker, or a Google tag for the Ads account', () => {
    expect(run(RSK_02, container({ tags: [tag('awct'), tag('gclidw')] }))).toEqual([]);
    expect(run(RSK_02, container({ tags: [tag('awct'), googleTag('AW-123')] }))).toEqual([]);
  });
});

describe('RSK-03 Conversion Linker after optimization', () => {
  it('is skipped on Legacy containers, so it can never contradict RSK-02', () => {
    const parsed = parseContainer(container({ tags: [tag('gclidw')] }));
    if (!parsed.ok) throw new Error();
    const r = audit(parsed.model, [RSK_03]);
    expect(r.findings).toEqual([]);
    expect(r.rulesSkipped[0]!.id).toBe('RSK-03');
  });
  it('fires when the container is Optimized', () => {
    const parsed = parseContainer(container({ tags: [tag('gclidw')] }));
    if (!parsed.ok) throw new Error();
    parsed.model.state.state = 'Optimized';
    expect(audit(parsed.model, [RSK_03]).findings).toHaveLength(1);
  });
});

describe('RSK-04 Custom HTML scripts', () => {
  it('fires on unknown script domains and document.write', () => {
    const t = tag('html', { params: [tpl('html', '<script src="https://cdn.unknown-vendor.io/x.js"></script><script>document.write("x")</script>')] });
    expect(run(RSK_04, container({ tags: [t] })).map((f) => f.detailKey)).toEqual(['domains:cdn.unknown-vendor.io', 'document.write']);
  });
  it('stays quiet on known domains and relative scripts', () => {
    const t = tag('html', { params: [tpl('html', '<script src="https://snap.licdn.com/li.lms-analytics/insight.min.js"></script><script src="/js/local.js"></script>'), bool('supportDocumentWrite', false)] });
    expect(run(RSK_04, container({ tags: [t] }))).toEqual([]);
  });
});

describe('RSK-05 template with broad permissions', () => {
  const broad = template('7', 'Any Script Loader', [{ id: 'inject_script', params: { urls: { type: 2, listItem: [{ type: 1, string: 'https://*/' }] } } }]);
  const scoped = template('8', 'Scoped', [{ id: 'inject_script', params: { urls: { type: 2, listItem: [{ type: 1, string: 'https://snap.licdn.com/*' }] } } }]);
  it('fires on a used template that can load scripts from anywhere', () => {
    const [f] = run(RSK_05, container({ templates: [broad], tags: [tag('cvt_2_7')] }));
    expect(f!.message).toMatch(/load scripts from any domain/);
  });
  it('stays quiet for scoped permissions and unused templates', () => {
    expect(run(RSK_05, container({ templates: [broad, scoped], tags: [tag('cvt_2_8')] }))).toEqual([]);
  });
});

describe('RSK-06 Universal Analytics', () => {
  it('fires on UA tags, paused or not', () => {
    expect(run(RSK_06, container({ tags: [tag('ua', { paused: true })] }))).toHaveLength(1);
    expect(run(RSK_06, container({ tags: [tag('opt')] }))[0]!.message).toMatch(/Google Optimize/);
  });
  it('stays quiet without UA', () => {
    expect(run(RSK_06, container({ tags: [ga4Event('x')] }))).toEqual([]);
  });
});

describe('RSK-07 reference to a variable that does not exist', () => {
  it('fires on missing variables and on built-ins that are not enabled', () => {
    const t = tag('html', { params: [tpl('html', '<script>var a={{DLV - gone}}, b={{Form ID}};</script>')] });
    const f = run(RSK_07, container({ tags: [t] }));
    expect(f.map((x) => x.detailKey).sort()).toEqual(['DLV - gone', 'Form ID']);
    expect(f.find((x) => x.detailKey === 'Form ID')!.where.path).toMatch(/Built-In Variables/);
  });
  it('stays quiet on defined variables, enabled built-ins and GTM internals', () => {
    const ce = trigger('CUSTOM_EVENT', { customEvent: 'x' });
    expect(run(RSK_07, container({ triggers: [ce], tags: [tag('html', { params: [tpl('html', '{{Page URL}}')] })] }))).toEqual([]);
  });
});

describe('RSK-08 marketing tag set to fire without consent', () => {
  const pixel = template('9', 'Facebook Pixel', [{ id: 'inject_script' }]);
  it('fires on a marketing template set to "No additional consent required"', () => {
    const [f] = run(RSK_08, container({ templates: [pixel], tags: [tag('cvt_2_9', { consent: 'NOT_NEEDED' })] }));
    expect(f).toMatchObject({ severity: 'warning', confidence: 'check-in-preview' });
    expect(f!.message).toMatch(/Facebook Pixel.*No additional consent required/);
  });
  it('stays quiet for built-in consent tags, consent required, Not set (RSK-01\'s job) and paused tags', () => {
    const f = run(RSK_08, container({
      templates: [pixel],
      tags: [
        tag('baut', { consent: 'NOT_NEEDED' }),
        tag('awct', { consent: 'NOT_NEEDED' }),
        tag('cvt_2_9', { consent: 'NEEDED' }),
        tag('cvt_2_9', { consent: 'NOT_SET' }),
        tag('cvt_2_9', { consent: 'NOT_NEEDED', paused: true }),
      ],
    }));
    expect(f).toEqual([]);
  });
  it('never tells the user what the law requires', () => {
    const text = [RSK_08.why, RSK_08.fix].join(' ');
    expect(text).not.toMatch(/\b(illegal|unlawful|breach|violat|non-?complian|GDPR requires|must comply)/i);
  });
});

describe('RSK-09 custom template not used', () => {
  it('fires for a template no tag or variable uses', () => {
    const f = run(RSK_09, container({ templates: [template('5', 'Old Pixel', []), template('6', 'Live Pixel', [])], tags: [tag('cvt_2_6')] }));
    expect(f).toHaveLength(1);
    expect(f[0]!.entity).toMatchObject({ kind: 'template', id: '5', name: 'Old Pixel' });
  });
  it('stays quiet when every template is used by a tag or a variable', () => {
    expect(run(RSK_09, container({ templates: [template('7', 'Tag template', []), template('8', 'Variable template', [])], tags: [tag('cvt_2_7')], variables: [variable('cvt_2_8', 'From template')] }))).toEqual([]);
  });
});

describe('RSK-10 analytics or session-recording tag that doesn\'t wait for consent', () => {
  const clarity = template('30', 'Microsoft Clarity - Official', [{ id: 'inject_script' }]);
  it('fires on an analytics template, the Hotjar tag type and Custom HTML loading Hotjar', () => {
    const html = tag('html', { consent: 'NOT_SET', params: [tpl('html', '<script src="https://static.hotjar.com/c/hotjar-1.js"></script>')] });
    const f = run(RSK_10, container({ templates: [clarity], tags: [tag('cvt_2_30', { consent: 'NOT_SET' }), tag('hjtc', { consent: 'NOT_SET' }), html] }));
    expect(f).toHaveLength(3);
    expect(f.every((x) => x.severity === 'warning' && x.confidence === 'definite')).toBe(true);
  });
  it('flags "No additional consent required" as a check-in-preview item', () => {
    const [f] = run(RSK_10, container({ templates: [clarity], tags: [tag('cvt_2_30', { consent: 'NOT_NEEDED' })] }));
    expect(f).toMatchObject({ severity: 'warning', confidence: 'check-in-preview' });
    expect(f!.message).toMatch(/No additional consent required/);
  });
  it('stays quiet when consent is set, for Google tags, for marketing tags (RSK-01\'s job) and for paused tags', () => {
    const pixel = tag('html', { consent: 'NOT_SET', params: [tpl('html', '<script>fbq("init","1")</script>')] });
    const f = run(RSK_10, container({
      templates: [clarity],
      tags: [tag('cvt_2_30', { consent: 'NEEDED' }), tag('cvt_2_30', { consent: 'NOT_SET', paused: true }), tag('gaawe', { consent: 'NOT_SET' }), pixel],
    }));
    expect(f).toEqual([]);
  });
});
