/**
 * GA4 collection limits. Single source of truth for every GA4 rule.
 *
 * Google: "You can increase certain limits (but not event/parameter
 * character limits) by upgrading your property to Google Analytics 360."
 * So character limits are hard errors everywhere; count limits are hard
 * errors on standard properties only.
 */
export const GA4_LIMITS = {
  source: 'https://support.google.com/analytics/answer/9267744?hl=en',
  verifiedOn: '2026-11-04',

  eventNameMaxLength: { value: 40, raisableWith360: false },
  paramsPerEvent: { value: 25, raisableWith360: true },
  paramNameMaxLength: { value: 40, raisableWith360: false },
  paramValueMaxLength: {
    value: 100,
    raisableWith360: false,
    exceptions: { page_title: 300, page_referrer: 420, page_location: 1000 } as Record<string, number>,
  },
  itemScopedCustomParamsPerEvent: { value: 27, raisableWith360: true },
  userPropertiesPerProperty: { value: 25, raisableWith360: true },
  userPropertyNameMaxLength: { value: 24, raisableWith360: false },
  userPropertyValueMaxLength: { value: 36, raisableWith360: false },
  userIdMaxLength: { value: 256, raisableWith360: false },

  /** A key event name over 40 chars won't report as a key event (the appended "_c" is lost). */
  keyEventNote:
    'If you mark an event as a key event and the event exceeds 40 characters, then the event will not be reported as a key event.',
} as const;
