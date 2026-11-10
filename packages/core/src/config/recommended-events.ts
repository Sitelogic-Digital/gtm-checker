/**
 * GA4 recommended events, and custom names people commonly use instead.
 * Source: https://support.google.com/analytics/answer/9267735
 *
 * Synonyms are matched after normalising (lowercase, separators removed),
 * so "Lead-Submit", "leadSubmit" and "lead_submit" all match "leadsubmit".
 */
export const RECOMMENDED_EVENTS = {
  source: 'https://support.google.com/analytics/answer/9267735',

  names: [
    'add_payment_info', 'add_shipping_info', 'add_to_cart', 'add_to_wishlist', 'begin_checkout',
    'close_convert_lead', 'close_unconvert_lead', 'disqualify_lead', 'earn_virtual_currency',
    'generate_lead', 'join_group', 'level_end', 'level_start', 'level_up', 'login', 'post_score',
    'purchase', 'qualify_lead', 'refund', 'remove_from_cart', 'search', 'select_content',
    'select_item', 'select_promotion', 'share', 'sign_up', 'spend_virtual_currency',
    'tutorial_begin', 'tutorial_complete', 'unlock_achievement', 'view_cart', 'view_item',
    'view_item_list', 'view_promotion', 'working_lead',
  ],

  /** Normalised custom name → recommended event it duplicates. */
  synonyms: {
    lead: 'generate_lead',
    leadsubmit: 'generate_lead',
    submitlead: 'generate_lead',
    leadform: 'generate_lead',
    formlead: 'generate_lead',
    leadgenerated: 'generate_lead',
    leadgen: 'generate_lead',
    leadformsubmit: 'generate_lead',
    signup: 'sign_up',
    register: 'sign_up',
    registration: 'sign_up',
    accountcreated: 'sign_up',
    createaccount: 'sign_up',
    signupcomplete: 'sign_up',
    login: 'login',
    signin: 'login',
    userlogin: 'login',
    addcart: 'add_to_cart',
    addtobasket: 'add_to_cart',
    addbasket: 'add_to_cart',
    startcheckout: 'begin_checkout',
    checkoutstart: 'begin_checkout',
    initiatecheckout: 'begin_checkout',
    ordercomplete: 'purchase',
    ordercompleted: 'purchase',
    orderplaced: 'purchase',
    checkoutcomplete: 'purchase',
    transaction: 'purchase',
    sitesearch: 'search',
    searchsubmit: 'search',
  } as Record<string, string>,
} as const;
