/**
 * Script domains we recognise in Custom HTML. Matching is by domain suffix,
 * so "connect.facebook.net" matches "facebook.net". Recognised doesn't mean
 * safe; it means a reviewer will know what it is.
 */
export const KNOWN_SCRIPT_DOMAINS: Record<string, { vendor: string; marketing: boolean }> = {
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
  'clarity.ms': { vendor: 'Microsoft Clarity', marketing: false },
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
  'criteo.net': { vendor: 'Criteo', marketing: true },
  'criteo.com': { vendor: 'Criteo', marketing: true },
  'quantserve.com': { vendor: 'Quantcast', marketing: true },
  'hotjar.com': { vendor: 'Hotjar', marketing: false },
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

export function lookupDomain(host: string): { vendor: string; marketing: boolean } | undefined {
  const h = host.toLowerCase().replace(/^www\./, '');
  for (const [domain, info] of Object.entries(KNOWN_SCRIPT_DOMAINS)) {
    if (h === domain || h.endsWith(`.${domain}`)) return info;
  }
  return undefined;
}
