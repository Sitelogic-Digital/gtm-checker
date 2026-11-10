import { resolveConstant } from '../../ga4';
import type { Tag } from '../../model';
import { paramString } from '../../params';
import { ALL_STATES, list, PAGE_LOAD_TRIGGERS, tagEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule, RuleContext } from '../types';

interface PageViewSender {
  tag: Tag;
  measurementId: string;
  kind: 'google-tag' | 'event-tag';
  onLoad: boolean;
  onHistory: boolean;
  /** Google tags only: fires on something other than page load or history change. */
  onOtherEvents: string[];
  triggerIds: string[];
}

/** The Google tag sends page_view unless send_page_view is set to false in its configuration settings. */
function googleTagSendsPageView(t: Tag, ctx: RuleContext): boolean {
  const rows = Array.isArray(t.params.configSettingsTable) ? t.params.configSettingsTable : [];
  for (const r of rows) {
    if (r && typeof r === 'object' && !Array.isArray(r) && !('$ref' in r) && r.parameter === 'send_page_view') {
      const v = typeof r.parameterValue === 'string' ? resolveConstant(r.parameterValue, ctx.graph) : '';
      return v.toLowerCase() !== 'false';
    }
  }
  return true;
}

function senders(ctx: RuleContext): PageViewSender[] {
  const out: PageViewSender[] = [];
  const triggerTypes = (ids: string[]) => ids.map((id) => ctx.graph.triggersById.get(id)?.type.key ?? '');
  for (const t of ctx.model.tags) {
    if (t.paused) continue;
    let mid: string | undefined;
    let kind: PageViewSender['kind'] | undefined;
    if (t.type.key === 'googtag' && googleTagSendsPageView(t, ctx)) {
      mid = resolveConstant(paramString(t.params, 'tagId') ?? '', ctx.graph);
      kind = 'google-tag';
    } else if (t.type.key === 'gaawe') {
      const send = ctx.events.flatMap((e) => e.sends).find((s) => s.tagId === t.id);
      if (send?.eventName === 'page_view') {
        mid = send.measurementId;
        kind = 'event-tag';
      }
    }
    if (!kind || !mid || !/^G-/i.test(mid)) continue;
    const types = triggerTypes(t.firingTriggerIds);
    out.push({
      tag: t,
      measurementId: mid.toUpperCase(),
      kind,
      onLoad: types.some((x) => PAGE_LOAD_TRIGGERS.has(x)),
      onHistory: types.includes('HISTORY_CHANGE'),
      onOtherEvents:
        kind === 'google-tag'
          ? t.firingTriggerIds
              .map((id) => ctx.graph.triggersById.get(id))
              .filter((x) => x && !PAGE_LOAD_TRIGGERS.has(x.type.key) && x.type.key !== 'HISTORY_CHANGE')
              .map((x) => x!.name)
          : [],
      triggerIds: t.firingTriggerIds,
    });
  }
  return out;
}

export const TRG_01: Rule = {
  id: 'TRG-01',
  title: 'page_view sent more than once per page',
  area: 'triggers',
  severity: 'warning',
  confidence: 'check-in-preview',
  appliesTo: ALL_STATES,
  why: 'Duplicate page_view hits inflate views, lower engagement rate, and make every per-page metric wrong. A Google tag sends page_view every time it fires unless told not to, and on single-page apps GA4\'s enhanced measurement already sends page_view on history changes by default.',
  fix: 'Keep one source of page_view per page load. If the Google tag sends it, remove the extra page_view tag, or set send_page_view to false on the Google tag. For single-page apps, use either enhanced measurement\'s "page changes based on browser history events" or a History Change trigger, not both.',
  where: WHERE.tags,
  run(ctx) {
    const out: FindingDraft[] = [];
    const all = senders(ctx);

    for (const s of all.filter((x) => x.onHistory)) {
      out.push({
        entity: tagEntity(s.tag),
        message: `This ${s.kind === 'google-tag' ? 'Google tag' : 'tag'} sends page_view to ${s.measurementId} on History Change. GA4's enhanced measurement does the same by default, so unless that option is off for this stream, every in-app navigation counts twice.`,
        detailKey: `history:${s.measurementId}`,
      });
    }

    for (const s of all.filter((x) => x.onOtherEvents.length)) {
      out.push({
        entity: tagEntity(s.tag),
        message: `This Google tag for ${s.measurementId} fires on ${list(s.onOtherEvents, 2)}, not just on page load, and doesn't set send_page_view to false. Each time it fires, it's likely to send another page_view.`,
        fix: 'If this tag is only here to update settings (such as user or page parameters), add send_page_view = false to its Configuration settings. Better still, send those values as event parameters on the events that need them.',
        detailKey: `refire:${s.measurementId}`,
      });
    }

    const byMid = new Map<string, PageViewSender[]>();
    for (const s of all.filter((x) => x.onLoad)) byMid.set(s.measurementId, [...(byMid.get(s.measurementId) ?? []), s]);
    for (const [mid, list_] of byMid) {
      if (list_.length < 2) continue;
      const shared = new Set(list_.flatMap((s) => s.triggerIds).filter((id, i, a) => a.indexOf(id) !== i));
      const sameTrigger = shared.size > 0;
      out.push({
        entity: { kind: 'measurement-id', id: mid, name: mid },
        related: list_.map((s) => tagEntity(s.tag)),
        // Same trigger on two senders is provable; different triggers might be on different pages.
        confidence: sameTrigger ? 'definite' : 'check-in-preview',
        message: `${list_.length} tags send page_view to ${mid} on page load: ${list(list_.map((s) => s.tag.name), 4)}.${sameTrigger ? ' At least two of them share a trigger, so they fire on the same pages.' : ' They use different triggers, so check in Preview whether any page fires more than one.'}`,
        detailKey: `load:${list_.map((s) => s.tag.id).sort().join(',')}`,
      });
    }
    return out;
  },
};
