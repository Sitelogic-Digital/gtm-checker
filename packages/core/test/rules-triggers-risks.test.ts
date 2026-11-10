import { describe, expect, it } from 'vitest';
import { RSK_01 } from '../src/rules/catalog/rsk-01-consent-not-set';
import { RSK_02 } from '../src/rules/catalog/rsk-02-missing-conversion-linker';
import { RSK_03 } from '../src/rules/catalog/rsk-03-linker-after-optimization';
import { RSK_04 } from '../src/rules/catalog/rsk-04-custom-html';
import { RSK_05 } from '../src/rules/catalog/rsk-05-template-permissions';
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
import { ALL_PAGES, cond, container, ga4Event, googleTag, run, tag, template, tpl, trigger, bool } from './builders';

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
    expect(f.map((x) => x.message)).toEqual([
      expect.stringMatching(/won't compile/),
      expect.stringMatching(/matches everything/),
      expect.stringMatching(/never fires/),
    ]);
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
  const pixel = template('9', 'Facebook Pixel', []);
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
