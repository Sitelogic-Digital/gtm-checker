/**
 * GA4 reserved names for web streams.
 * Source lists events that "can't be used", but it includes names GTM
 * legitimately sends (page_view) and names enhanced measurement sends
 * itself. We split them by consequence rather than treating the list as one.
 */
export const GA4_RESERVED = {
  source: 'https://support.google.com/analytics/answer/13316687?hl=en',
  verifiedOn: '2026-11-09',

  /** GA4 rejects or overwrites these. Sending them from GTM breaks reporting. Critical. */
  rejectedEventNames: [
    'ad_impression',
    'app_remove',
    'app_store_refund',
    'app_store_subscription_cancel',
    'app_store_subscription_renew',
    'error',
    'first_open',
    'first_visit',
    'in_app_purchase',
    'session_start',
    'user_engagement',
  ],

  /**
   * Enhanced measurement sends these automatically. Sending them yourself is
   * allowed, but double counts if enhanced measurement is also on. Warning.
   * Google's list says "view_complete"; the enhanced measurement event is
   * video_complete, so both are included.
   */
  enhancedMeasurementEventNames: [
    'click',
    'file_download',
    'form_start',
    'form_submit',
    'scroll',
    'video_complete',
    'video_progress',
    'video_start',
    'view_complete',
    'view_search_results',
  ],

  /** Fine to send from GTM; listed so nothing else flags it. */
  allowedReservedEventNames: ['page_view'],

  /** Event name prefixes. Google's web list gives only query_id; the others are rejected by the collection endpoint. */
  eventNamePrefixes: ['_', 'firebase_', 'ga_', 'google_', 'gtag.', 'query_id'],

  /** Event parameter names can't begin with these. */
  paramNamePrefixes: ['_', 'firebase_', 'ga_', 'google_', 'gtag.'],

  /** User property names can't begin with these. */
  userPropertyPrefixes: ['_', 'firebase_', 'ga_', 'google_'],
} as const;
