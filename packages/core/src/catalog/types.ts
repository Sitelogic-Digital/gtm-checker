/**
 * Known type keys for tags, triggers and variables.
 *
 * Anything not listed here is kept and shown as "Not recognised yet".
 * Add a key only once it has been seen in a real export.
 */
import type { TagCategory } from '../model';

export const TAG_TYPES: Record<string, { label: string; category: TagCategory }> = {
  googtag: { label: 'Google tag', category: 'google-tag' },
  gaawc: { label: 'GA4 Configuration (pre-2023)', category: 'ga4-config' },
  gaawe: { label: 'GA4 Event', category: 'ga4-event' },
  ua: { label: 'Universal Analytics', category: 'universal-analytics' },
  awct: { label: 'Google Ads Conversion Tracking', category: 'google-ads' },
  sp: { label: 'Google Ads Remarketing', category: 'google-ads' },
  awud: { label: 'Google Ads User-Provided Data Event', category: 'google-ads' },
  awcc: { label: 'Google Ads Calls from Website Conversion', category: 'google-ads' },
  gclidw: { label: 'Conversion Linker', category: 'conversion-linker' },
  flc: { label: 'Floodlight Counter', category: 'floodlight' },
  fls: { label: 'Floodlight Sales', category: 'floodlight' },
  html: { label: 'Custom HTML', category: 'custom-html' },
  img: { label: 'Custom Image', category: 'custom-image' },
  baut: { label: 'Microsoft Advertising UET', category: 'marketing' },
  bzi: { label: 'LinkedIn Insight', category: 'marketing' },
  pntr: { label: 'Pinterest', category: 'marketing' },
  hjtc: { label: 'Hotjar Tracking Code', category: 'other' },
  opt: { label: 'Google Optimize (discontinued)', category: 'other' },
};

export const VARIABLE_TYPES: Record<string, string> = {
  v: 'Data Layer Variable',
  c: 'Constant',
  u: 'URL',
  jsm: 'Custom JavaScript',
  j: 'JavaScript Variable',
  k: '1st-Party Cookie',
  d: 'DOM Element',
  aev: 'Auto-Event Variable',
  e: 'Custom Event',
  f: 'HTTP Referrer',
  r: 'Random Number',
  smm: 'Lookup Table',
  remm: 'RegEx Table',
  gas: 'Google Analytics Settings (Universal Analytics)',
  gtes: 'Google Tag: Event Settings',
  gtcs: 'Google Tag: Configuration Settings',
  vis: 'Element Visibility',
  ctv: 'Container Version Number',
  dbg: 'Debug Mode',
  cid: 'Container ID',
  awec: 'User-Provided Data',
  uv: 'Undefined Value',
};

export const TRIGGER_TYPES: Record<string, string> = {
  PAGEVIEW: 'Page View',
  DOM_READY: 'DOM Ready',
  WINDOW_LOADED: 'Window Loaded',
  CUSTOM_EVENT: 'Custom Event',
  CLICK: 'All Elements click',
  LINK_CLICK: 'Just Links click',
  FORM_SUBMISSION: 'Form Submission',
  HISTORY_CHANGE: 'History Change',
  TIMER: 'Timer',
  SCROLL_DEPTH: 'Scroll Depth',
  ELEMENT_VISIBILITY: 'Element Visibility',
  YOU_TUBE_VIDEO: 'YouTube Video',
  JS_ERROR: 'JavaScript Error',
  TRIGGER_GROUP: 'Trigger Group',
  CONSENT_INIT: 'Consent Initialization',
  INIT: 'Initialization',
  ALWAYS: 'Always',
};

/**
 * Built-in triggers referenced by ID but never listed in trigger[].
 * IDs are fixed across containers.
 */
export const BUILT_IN_TRIGGERS: Record<string, { name: string; type: string }> = {
  '2147479553': { name: 'All Pages', type: 'PAGEVIEW' },
  '2147479572': { name: 'Consent Initialization - All Pages', type: 'CONSENT_INIT' },
  '2147479573': { name: 'Initialization - All Pages', type: 'INIT' },
};

/** Built-in variable display names, so we can tell "not enabled" apart from "doesn't exist". */
export const BUILT_IN_VARIABLE_NAMES: Record<string, string> = {
  'Page URL': 'PAGE_URL',
  'Page Hostname': 'PAGE_HOSTNAME',
  'Page Path': 'PAGE_PATH',
  Referrer: 'REFERRER',
  Event: 'EVENT',
  'Click Element': 'CLICK_ELEMENT',
  'Click Classes': 'CLICK_CLASSES',
  'Click ID': 'CLICK_ID',
  'Click Target': 'CLICK_TARGET',
  'Click URL': 'CLICK_URL',
  'Click Text': 'CLICK_TEXT',
  'Form Element': 'FORM_ELEMENT',
  'Form Classes': 'FORM_CLASSES',
  'Form ID': 'FORM_ID',
  'Form Target': 'FORM_TARGET',
  'Form URL': 'FORM_URL',
  'Form Text': 'FORM_TEXT',
  'Error Message': 'ERROR_MESSAGE',
  'Error URL': 'ERROR_URL',
  'Error Line': 'ERROR_LINE',
  'Debug Mode': 'DEBUG_MODE',
  'Random Number': 'RANDOM_NUMBER',
  'Container ID': 'CONTAINER_ID',
  'Container Version': 'CONTAINER_VERSION',
  'HTML ID': 'HTML_ID',
  'Environment Name': 'ENVIRONMENT_NAME',
  'New History Fragment': 'NEW_HISTORY_FRAGMENT',
  'Old History Fragment': 'OLD_HISTORY_FRAGMENT',
  'New History State': 'NEW_HISTORY_STATE',
  'Old History State': 'OLD_HISTORY_STATE',
  'New History URL': 'NEW_HISTORY_URL',
  'Old History URL': 'OLD_HISTORY_URL',
  'History Source': 'HISTORY_SOURCE',
  'Video Provider': 'VIDEO_PROVIDER',
  'Video Status': 'VIDEO_STATUS',
  'Video URL': 'VIDEO_URL',
  'Video Title': 'VIDEO_TITLE',
  'Video Duration': 'VIDEO_DURATION',
  'Video Current Time': 'VIDEO_CURRENT_TIME',
  'Video Percent': 'VIDEO_PERCENT',
  'Video Visible': 'VIDEO_VISIBLE',
  'Scroll Depth Threshold': 'SCROLL_DEPTH_THRESHOLD',
  'Scroll Depth Units': 'SCROLL_DEPTH_UNITS',
  'Scroll Direction': 'SCROLL_DEPTH_DIRECTION',
  'Percent Visible': 'ELEMENT_VISIBILITY_RATIO',
  'On-Screen Duration': 'ELEMENT_VISIBILITY_TIME',
  'First Time Visible': 'ELEMENT_VISIBILITY_FIRST_TIME',
  'Visible Elements': 'ELEMENT_VISIBILITY_RECENT_TIME',
};
