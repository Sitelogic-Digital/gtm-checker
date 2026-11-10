#!/usr/bin/env node
/**
 * Generates the web app's CSS from the Sitelogic design system.
 * tokens.json is the source of truth; never hand-edit the output.
 *
 *   design/tokens.json            → apps/web/app/styles/tokens.css
 *   design/components/bundle.css  → apps/web/app/styles/sitelogic-components.css
 *   design/fonts/*.woff2          → apps/web/public/fonts/
 *   design/assets/*               → apps/web/public/brand/ (logo marks, used as supplied)
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, '../apps/web');
const tokens = JSON.parse(readFileSync(join(here, 'tokens.json'), 'utf8'));

/** CSS custom property name; dots must be escaped (space-1.5 → --space-1\.5), matching bundle.css. */
const v = (name) => `--${name.replace(/\./g, '\\.')}`;
const alias = (value) => (typeof value === 'string' ? value.replace(/^\{([^}]+)\}$/, (_, n) => `var(${v(n)})`) : value);

const themes = tokens.color.themes.map((t) => t.id);
const root = [];
const perTheme = Object.fromEntries(themes.map((t) => [t, []]));

for (const tok of tokens.color.tokens) {
  if (typeof tok.value === 'string') root.push(`  ${v(tok.name)}: ${alias(tok.value)};`);
  else for (const t of themes) perTheme[t].push(`  ${v(tok.name)}: ${alias(tok.value[t] ?? tok.value[themes[0]])};`);
}
for (const family of ['spacing', 'radius', 'shadow', 'layout']) {
  for (const tok of tokens[family]?.tokens ?? []) root.push(`  ${v(tok.name)}: ${tok.value};`);
}
for (const [name, stack] of Object.entries(tokens.type.families)) root.push(`  --font-${name}: ${stack};`);

const fontFaces = tokens.type.fonts.map((f) => {
  const file = f.file.split('/').pop();
  return `@font-face { font-family: "${f.family}"; src: url("/fonts/${file}") format("woff2"); font-weight: ${f.weight}; font-style: normal; font-display: swap; }`;
});

const typeClasses = tokens.type.groups.flatMap((g) =>
  g.styles.map((s) => {
    const lh = typeof s.lineHeight === 'number' ? s.lineHeight : s.lineHeight;
    const rules = [
      `font-family: var(--font-${g.family})`,
      `font-size: ${s.fontSize}`,
      `line-height: ${lh}`,
      `font-weight: ${s.fontWeight}`,
      s.letterSpacing ? `letter-spacing: ${s.letterSpacing}` : null,
      g.family === 'mono' && s.name !== 'marker' ? 'text-transform: uppercase' : null,
    ].filter(Boolean);
    return `.type-${s.name} { ${rules.join('; ')}; }`;
  }),
);

const css = [
  `/* ${tokens.name} v${tokens.version} — generated from design/tokens.json by design/build-tokens.mjs. Do not edit. */`,
  ...fontFaces,
  '',
  `:root {\n${root.join('\n')}\n}`,
  ...themes.map((t, i) => `${i === 0 ? ':root, ' : ''}[data-theme="${t}"] {\n${perTheme[t].join('\n')}\n}`),
  '',
  ...typeClasses,
  '',
].join('\n');

mkdirSync(join(web, 'app/styles'), { recursive: true });
writeFileSync(join(web, 'app/styles/tokens.css'), css);
copyFileSync(join(here, 'components/bundle.css'), join(web, 'app/styles/sitelogic-components.css'));
mkdirSync(join(web, 'public/fonts'), { recursive: true });
for (const f of readdirSync(join(here, 'fonts'))) copyFileSync(join(here, 'fonts', f), join(web, 'public/fonts', f));

console.log(`tokens.css: ${tokens.color.tokens.length} colours, ${themes.length} themes, ${typeClasses.length} type styles`);
mkdirSync(join(web, 'public/brand'), { recursive: true });
for (const f of readdirSync(join(here, 'assets'))) copyFileSync(join(here, 'assets', f), join(web, 'public/brand', f));
