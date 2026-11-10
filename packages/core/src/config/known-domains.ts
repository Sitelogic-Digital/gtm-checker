/**
 * Script domains we recognise in Custom HTML. Matching is by domain suffix,
 * so "connect.facebook.net" matches "facebook.net". Recognised doesn't mean
 * safe; it means a reviewer will know what it is.
 */
/** `analytics`: measures or records how visitors use the site (analytics, session recording, heatmaps). */
export interface KnownDomain {
  vendor: string;
  marketing: boolean;
  analytics?: boolean;
}

export const KNOWN_SCRIPT_DOMAINS: Record<string, KnownDomain> = {
  'googletagmanager.com': { vendor: 'Google', marketing: false },
  'google-analytics.com': { vendor: 'Google Analytics', marketing: false },
  'googleadservices.com': { vendor: 'Google Ads', marketing: true },
  'googlesyndication.com': { vendor: 'Google Ads', marketing: true },
  'doubleclick.net': { vendor: 'Google Marketing Platform', marketing: true },
  'google.com': { vendor: 'Google', marketing: false },
  'gstatic.com': { vendor: 'Google', marketing: false },
  'facebook.net': { vendor: 'Meta', marketing: true },
  'facebook.com': { vendor: 'Meta', marketing: true },
  'bat.bing.com': { vendor: 'Microsoft Advertising', marketing: true },
  'clarity.ms': { vendor: 'Microsoft Clarity', marketing: false, analytics: true },
  'licdn.com': { vendor: 'LinkedIn', marketing: true },
  'linkedin.com': { vendor: 'LinkedIn', marketing: true },
  'ads-twitter.com': { vendor: 'X (Twitter)', marketing: true },
  'twitter.com': { vendor: 'X (Twitter)', marketing: true },
  'pinimg.com': { vendor: 'Pinterest', marketing: true },
  'tiktok.com': { vendor: 'TikTok', marketing: true },
  'snapchat.com': { vendor: 'Snap', marketing: true },
  'redditstatic.com': { vendor: 'Reddit', marketing: true },
  'outbrain.com': { vendor: 'Outbrain', marketing: true },
  'taboola.com': { vendor: 'Taboola', marketing: true },
  'adroll.com': { vendor: 'AdRoll', marketing: true },
  'stackadapt.com': { vendor: 'StackAdapt', marketing: true },
  'simpli.fi': { vendor: 'Simpli.fi', marketing: true },
  'criteo.net': { vendor: 'Criteo', marketing: true },
  'criteo.com': { vendor: 'Criteo', marketing: true },
  'quantserve.com': { vendor: 'Quantcast', marketing: true },
  'hotjar.com': { vendor: 'Hotjar', marketing: false, analytics: true },
  'contentsquare.net': { vendor: 'Contentsquare', marketing: false, analytics: true },
  'fullstory.com': { vendor: 'FullStory', marketing: false, analytics: true },
  'mouseflow.com': { vendor: 'Mouseflow', marketing: false, analytics: true },
  'heapanalytics.com': { vendor: 'Heap', marketing: false, analytics: true },
  'mixpanel.com': { vendor: 'Mixpanel', marketing: false, analytics: true },
  'mxpnl.com': { vendor: 'Mixpanel', marketing: false, analytics: true },
  'amplitude.com': { vendor: 'Amplitude', marketing: false, analytics: true },
  'segment.com': { vendor: 'Segment', marketing: false, analytics: true },
  'smartlook.com': { vendor: 'Smartlook', marketing: false, analytics: true },
  'crazyegg.com': { vendor: 'Crazy Egg', marketing: false, analytics: true },
  'luckyorange.com': { vendor: 'Lucky Orange', marketing: false, analytics: true },
  'pagesense.io': { vendor: 'Zoho PageSense', marketing: false, analytics: true },
  'acsbapp.com': { vendor: 'accessiBe (accessibility widget)', marketing: false },
  'hs-scripts.com': { vendor: 'HubSpot', marketing: true },
  'hs-analytics.net': { vendor: 'HubSpot', marketing: true },
  'hsforms.net': { vendor: 'HubSpot', marketing: false },
  'hubspot.com': { vendor: 'HubSpot', marketing: true },
  'marketo.net': { vendor: 'Marketo', marketing: true },
  'pardot.com': { vendor: 'Salesforce Pardot', marketing: true },
  'intercom.io': { vendor: 'Intercom', marketing: false },
  'intercomcdn.com': { vendor: 'Intercom', marketing: false },
  'drift.com': { vendor: 'Drift', marketing: false },
  'zdassets.com': { vendor: 'Zendesk', marketing: false },
  'cookiebot.com': { vendor: 'Cookiebot', marketing: false },
  'onetrust.com': { vendor: 'OneTrust', marketing: false },
  'cookielaw.org': { vendor: 'OneTrust', marketing: false },
  'termly.io': { vendor: 'Termly', marketing: false },
  'usercentrics.eu': { vendor: 'Usercentrics', marketing: false },
  'vimeo.com': { vendor: 'Vimeo', marketing: false },
  'youtube.com': { vendor: 'YouTube', marketing: false },
  'cloudflare.com': { vendor: 'Cloudflare', marketing: false },
  'jsdelivr.net': { vendor: 'jsDelivr CDN', marketing: false },
  'unpkg.com': { vendor: 'unpkg CDN', marketing: false },
};

export function lookupDomain(host: string): KnownDomain | undefined {
  const h = host.toLowerCase().replace(/^www\./, '');
  for (const [domain, info] of Object.entries(KNOWN_SCRIPT_DOMAINS)) {
    if (h === domain || h.endsWith(`.${domain}`)) return info;
  }
  return undefined;
}
