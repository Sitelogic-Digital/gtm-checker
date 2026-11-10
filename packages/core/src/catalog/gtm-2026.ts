/**
 * Signals for Google's 2026 container optimization (Google tag + GTM merge).
 *
 * EMPTY ON PURPOSE. The destination tag type keys, the container-level
 * Settings key and the new init-trigger mode aren't documented anywhere we
 * trust. Fill these from real optimized and mixed exports, using
 * `pnpm inspect --survey fixtures/private/*.json` to find the new keys.
 *
 * Until they're filled, state detection reports `provisional: true`.
 */

/** Tag type keys for the new Destination tags (GA4, Google Ads, Floodlight). */
export const DESTINATION_TAG_TYPES: Record<string, { label: string; destination: 'ga4' | 'google-ads' | 'floodlight' }> = {};

/** Top-level containerVersion keys that hold container-level shared Settings. */
export const CONTAINER_SETTINGS_KEYS: string[] = [];

/** Trigger type keys introduced with the optimization flow (beyond INIT). */
export const OPTIMIZED_TRIGGER_TYPES: string[] = [];

export const SIGNALS_CONFIRMED = false;
