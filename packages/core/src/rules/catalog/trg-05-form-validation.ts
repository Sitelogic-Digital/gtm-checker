import { ALL_STATES, triggerEntity, WHERE } from '../helpers';
import type { FindingDraft, Rule } from '../types';

export const TRG_05: Rule = {
  id: 'TRG-05',
  title: 'Form Submission trigger with Check Validation off',
  area: 'triggers',
  severity: 'warning',
  confidence: 'check-in-preview',
  appliesTo: ALL_STATES,
  why: 'With Check Validation off, the trigger fires when someone clicks Submit even if the form then rejects the input. Failed attempts count as leads, so conversion numbers run high.',
  fix: 'Tick "Check Validation" on the trigger. If the form submits with JavaScript and the trigger stops firing, switch to a data layer event pushed on successful submission instead.',
  where: WHERE.triggers,
  run({ model, graph }) {
    const out: FindingDraft[] = [];
    for (const t of model.triggers) {
      if (t.type.key !== 'FORM_SUBMISSION' || t.checkValidation === true) continue;
      const firing = (graph.tagsByTrigger.get(t.id)?.firing ?? []).map((id) => graph.tagsById.get(id)).filter((x) => x && !x.paused);
      if (!firing.length) continue; // An unused trigger is TRG-06's job.
      out.push({
        entity: triggerEntity(t),
        related: firing.map((x) => ({ kind: 'tag', id: x!.id, name: x!.name })),
        message: 'This Form Submission trigger has Check Validation off, so it fires on every Submit click, including ones the form rejects.',
        detailKey: 'checkValidation-off',
      });
    }
    return out;
  },
};
