import {
  CONTAINER_SETTINGS_KEYS,
  DESTINATION_TAG_TYPES,
  OPTIMIZED_TRIGGER_TYPES,
  SIGNALS_CONFIRMED,
} from './catalog/gtm-2026';
import type { StateDetection, Tag, Trigger } from './model';

/** Unmodelled containerVersion keys that are known noise, not 2026 signals. */
const IGNORABLE_CV_KEYS = new Set<string>([]);

/**
 * Legacy, Optimized or Mixed. Every rule reads this, so it reports its
 * evidence rather than just a label.
 */
export function detectState(
  tags: Tag[],
  triggers: Trigger[],
  extraContainerVersion: Record<string, unknown>,
): StateDetection {
  const legacySignals: string[] = [];
  const optimizedSignals: string[] = [];

  const count = (pred: (t: Tag) => boolean) => tags.filter(pred).length;

  const googleTags = count((t) => t.type.key === 'googtag');
  if (googleTags) legacySignals.push(`${googleTags} Google tag${googleTags === 1 ? '' : 's'} (googtag)`);
  const ga4Config = count((t) => t.type.key === 'gaawc');
  if (ga4Config) legacySignals.push(`${ga4Config} pre-2023 GA4 Configuration tag${ga4Config === 1 ? '' : 's'} (gaawc)`);

  for (const [key, info] of Object.entries(DESTINATION_TAG_TYPES)) {
    const n = count((t) => t.type.key === key);
    if (n) optimizedSignals.push(`${n} ${info.label} tag${n === 1 ? '' : 's'} (${key})`);
  }
  for (const key of CONTAINER_SETTINGS_KEYS) {
    if (key in extraContainerVersion) optimizedSignals.push(`Container-level Settings present (${key})`);
  }
  for (const type of OPTIMIZED_TRIGGER_TYPES) {
    const n = triggers.filter((t) => t.type.key === type).length;
    if (n) optimizedSignals.push(`${n} ${type} trigger${n === 1 ? '' : 's'}`);
  }

  const unexplainedSignals: string[] = [];
  const unknownTagTypes = new Set(tags.filter((t) => !t.type.recognised && !t.type.key.startsWith('cvt_')).map((t) => t.type.key));
  for (const k of unknownTagTypes) unexplainedSignals.push(`Unrecognised tag type "${k}"`);
  const unknownTriggerTypes = new Set(triggers.filter((t) => !t.type.recognised).map((t) => t.type.key));
  for (const k of unknownTriggerTypes) unexplainedSignals.push(`Unrecognised trigger type "${k}"`);
  for (const k of Object.keys(extraContainerVersion)) {
    if (!CONTAINER_SETTINGS_KEYS.includes(k) && !IGNORABLE_CV_KEYS.has(k)) unexplainedSignals.push(`Unmodelled container key "${k}"`);
  }

  const state =
    optimizedSignals.length && legacySignals.length
      ? 'Mixed'
      : optimizedSignals.length
        ? 'Optimized'
        : 'Legacy';

  return { state, provisional: !SIGNALS_CONFIRMED, legacySignals, optimizedSignals, unexplainedSignals };
}
