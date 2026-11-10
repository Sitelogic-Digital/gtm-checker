/** Shared by the server layout (boot script) and the client switch. Plain module: no 'use client'. */
export type Theme = 'ink' | 'bone';
export const THEME_KEY = 'gtm-auditor-theme';
/** Light (Bone) is the default; Dark (Ink) is opt-in. */
export const DEFAULT_THEME: Theme = 'bone';

/** Runs before paint so the chosen theme never flashes. Storage failures fall back to the default. */
export const THEME_BOOT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='bone'||t==='ink')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;
