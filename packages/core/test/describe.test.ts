import { describe, expect, it } from 'vitest';
import { audit, buildGraph, extractGa4Events, healthScores, unusedAreas, overviewParts, overviewSentences, parseContainer, triggerSentence } from '../src';
import { cond, container, ga4Event, tag, trigger } from './builders';

const load = (raw: ReturnType<typeof container>) => {
  const p = parseContainer(raw);
  if (!p.ok) throw new Error(p.error.message);
  return p.model;
};

describe('trigger sentences', () => {
  it('writes the brief\'s example', () => {
    const t = trigger('LINK_CLICK', { id: '1', filters: [cond('CONTAINS', '{{Click URL}}', '/thank-you'), cond('EQUALS', '{{Page Path}}', '/admin', { negate: true })] });
    const m = load(container({ triggers: [t], tags: [tag('html', { triggers: ['1'] })] }));
    expect(triggerSentence(m.triggers.find((x) => x.id === '1')!)).toBe('Fires on link clicks where Click URL contains /thank-you, except where Page Path equals /admin.');
  });
  it('names custom events, trigger groups, built-ins and form validation', () => {
    const ce = trigger('CUSTOM_EVENT', { id: '2', name: 'CE - lead', customEvent: 'lead' });
    const g = trigger('TRIGGER_GROUP', { id: '3', groupOf: ['2'] });
    const f = trigger('FORM_SUBMISSION', { id: '4', checkValidation: false });
    const m = load(container({ triggers: [ce, g, f], tags: [tag('html', { triggers: ['3', '4'] }), tag('html')] }));
    const g2 = buildGraph(m);
    const s = (id: string) => triggerSentence(m.triggers.find((x) => x.id === id)!, g2);
    expect(s('2')).toBe('Fires when the site pushes the data layer event "lead".');
    expect(s('3')).toBe('Fires once all of these have fired: "CE - lead".');
    expect(s('4')).toMatch(/every form submission\. Check Validation is off/);
    expect(s('2147479553')).toBe('Fires on every page view.');
  });
});

describe('health scores', () => {
  it('deducts per issue, not per finding, and halves check-in-preview issues', () => {
    const m = load(container({ tags: [tag('img', { consent: 'NOT_SET' }), tag('img', { consent: 'NOT_SET' }), ga4Event('scroll')] }));
    const scores = healthScores(audit(m));
    expect(scores.find((s) => s.area === 'consent')!.score).toBe(70);
    expect(scores.find((s) => s.area === 'ga4')!.score).toBe(95);
    expect(scores.find((s) => s.area === 'ads')!.score).toBe(100);
  });
});

describe('overview sentences', () => {
  it('states the facts in order', () => {
    const m = load(container({ tags: [ga4Event('a', {}, { mid: 'G-1' }), ga4Event('b', {}, { mid: 'G-2' }), tag('img', { consent: 'NOT_SET' }), tag('ua', { paused: true })] }));
    const g = buildGraph(m);
    const s = overviewSentences(m, g, extractGa4Events(m, g), audit(m));
    expect(s[0]).toBe('This container sends 2 GA4 events to 2 measurement IDs, from 2 GA4 event tags.');
    expect(s.join(' ')).toMatch(/1 tag is paused/);
    expect(s.join(' ')).toMatch(/1 critical issue, about consent, and no warnings\./);
  });
  it('marks key facts and links the ones with a view to open', () => {
    const m = load(container({ tags: [ga4Event('a', {}, { mid: 'G-1' }), tag('img', { consent: 'NOT_SET' })], triggers: [trigger('CLICK', { id: '70' })] }));
    const g = buildGraph(m);
    const parts = overviewParts(m, g, extractGa4Events(m, g), audit(m)).flat().filter((p) => typeof p !== 'string');
    const links = parts.flatMap((p) => (p.link ? [`${p.text} -> ${p.link.view}${p.link.sub ? `/${p.link.sub}` : ''}`] : []));
    expect(links).toEqual(['1 GA4 event -> events', '1 trigger isn\'t used by anything -> triggers/unused', '1 critical issue -> risks']);
  });
});

describe('scores for areas the container doesn\'t use', () => {
  it('gives GA4 and Ads no score when there are no such tags, instead of a misleading 100', () => {
    const m = load(container({ tags: [tag('ua'), tag('img', { consent: 'NOT_SET' })] }));
    const scores = healthScores(audit(m), unusedAreas(m.tags.map((t) => t.type.key)));
    expect(Object.fromEntries(scores.map((s) => [s.area, s.score]))).toMatchObject({ ga4: null, ads: null, consent: 70 });
  });
  it('scores GA4 normally when a GA4 tag is present', () => {
    const m = load(container({ tags: [ga4Event('a')] }));
    expect(healthScores(audit(m), unusedAreas(m.tags.map((t) => t.type.key))).find((s) => s.area === 'ga4')!.score).toBe(100);
  });
});
