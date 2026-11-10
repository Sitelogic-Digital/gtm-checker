# GTM Container Auditor

Reads a GTM container export (.json), explains it in plain language, and flags what will break GA4 data. Built for Sitelogic client audits first, public self-serve later. Full brief: `docs/brief.md`. **Web containers only**: server/AMP/app exports are rejected at import. Build legacy-first; most target users have legacy containers.

## Layout

- `packages/core` — parser, entity graph, GA4 extraction, (later) rule engine. **Zero runtime dependencies**: it runs in the browser, server actions and a future worker.
- `packages/rulesets` — JSON rulesets (house naming/folder conventions). Google-only defaults ship publicly.
- `apps/web` — Next.js App Router. Phase 1 UI: one client page at `/`, hash-routed views (#overview, #events, #triggers, #risks/RULE-ID). Everything is parsed and audited in the browser; nothing is uploaded or stored yet.
- `design/` — Sitelogic design system source, copied from the design-system artifact: `tokens.json` (source of truth), `fonts/`, `components/bundle.css`. `design/build-tokens.mjs` generates `apps/web/app/styles/tokens.css` and copies fonts/CSS; it runs before `dev` and `build`. Never hand-edit the generated files or hard-code hex values; `app.css` uses tokens only.
- `fixtures/private/` — real client exports. **Gitignored. Never commit, never log their contents.**

## Commands

- `pnpm test` / `pnpm --filter @gtm-audit/core test`
- `pnpm --filter @gtm-audit/core typecheck`
- `pnpm inspect <files>` — counts per file (compare with the GTM UI)
- `pnpm inspect --survey <files>` — unknown keys and type keys across files. Prints structure only, never values.
- `pnpm --filter @gtm-audit/web dev`

## Parser rules

- Build every link from IDs, never names. Exceptions GTM forces on us: setup/teardown tags and `TAG_REFERENCE` params reference tags by name.
- Unknown types and keys never crash the parse. They're kept (`extra`, `extraContainerVersion`), labelled "Not recognised yet", and counted in `unknownKeys`.
- Folder counts are user-created folders only. The GTM UI adds a virtual "Unfiled Items" folder (so it shows one more); `summary.counts.unfiledItems` counts what's in it. Phase 0 counts for the first client export were confirmed against the UI on 2026-11-09 on that basis.
- Built-in triggers (All Pages `2147479553`, Consent Init `2147479572`, Initialization `2147479573`) aren't in `trigger[]`; the parser synthesises them with `builtIn: true`.
- `{{_event}}` and other `_`-prefixed names are GTM internals, not missing variables.
- 2026 optimization signals live in `src/catalog/gtm-2026.ts` and are **empty until confirmed from real exports**. State detection reports `provisional: true` until then. Don't guess these keys.
- Anything that might be 2026 output (unrecognised non-template types, unmodelled containerVersion keys) goes in `state.unexplainedSignals`. When one appears in a real export, that file is the evidence to fill `gtm-2026.ts`.
- `test/private-fixtures.test.ts` runs every real export in `fixtures/private/` locally; it must stay green.
- GA4 limits live only in `src/config/ga4-limits.ts`, with source URL and `verifiedOn`.

## Rules (Phase 1+)

Rules live in `packages/core/src/rules/catalog/`, one file each, registered in `rules/index.ts`. Tests use the builders in `test/builders.ts`; every rule needs a firing and a quiet case. `pnpm inspect --audit <file>` prints findings (contains client names: local only).

Decisions so far (don't undo without new evidence):
- GA4-04 splits Google's reserved list: names GA4 rejects (session_start, first_visit…) are Critical; enhanced-measurement names (scroll, click, form_submit…) are a check-in-preview Warning; page_view is allowed.
- TRG-02 does not flag lookaheads: web containers evaluate trigger regex as JavaScript. Unverified either way, so it isn't a finding. It also doesn't flag `.*` on `{{_event}}` in a Custom Event trigger: that's the standard "any event" exception-trigger pattern (2026-11-10).
- GA4-01/GA4-03 (2026-11-10): Critical only for what Google documents as a failure (no name, over the length limit, reserved prefix). Bad characters or a non-letter start are a Warning, "breaks GA4's naming rules": Google's naming rules page (answer/13316687) says use only letters, numbers and underscores but doesn't say such names are dropped. Never write "GA4 will reject" for those.
- TRG-01 also covers a Google tag re-firing on non-page-load triggers without send_page_view=false.
- RSK-01 is a Warning (not Critical) when a consent-looking blocking trigger holds the tag back; the message asks to check the tag is also held back before the visitor chooses, when the value is often empty rather than "denied" (2026-11-10).
- Marketing classification (`marketingClass` in rsk-01, used by RSK-01 and RSK-08; 2026-11-10): a template tag counts only if its template can load or send something on its own (inject_script, send_pixel, set_cookies, inject_hidden_iframe). Helper templates such as Braze Actions (52 tags calling the SDK the Initialization tag loads) are never counted; the loading tag is the decision. Known analytics/replay vendors (Clarity, Hotjar, Contentsquare…) aren't marketing. Known ad/marketing vendors are definite; other templates that load code are check-in-preview.
- RSK-10 (added 2026-11-10, Peter): analytics or session-recording tag that doesn't wait for consent (`analyticsClass` in rsk-01: hjtc, analytics templates, Custom HTML loading or containing Clarity/Hotjar/Contentsquare etc.). Warning. "Not set" is definite (check-in-preview when gated); "No additional consent required" is check-in-preview. A tag is reported by RSK-01/08 or RSK-10, never both.
- RSK-01 skips tag types with Built-In Consent Checks (`BUILT_IN_CONSENT` in rules/helpers.ts: Google types plus Microsoft UET `baut`, confirmed from the GTM UI) and CMP templates, and drops to check-in-preview when a consent-looking trigger gates the tag.
- RSK-02 is satisfied by a Google tag for an AW-/GT- ID as well as a Conversion Linker.
- GA4-06 isn't built: it needs the 2026 destination tag keys.
- TRG-01 (2026-11-10) checks Google tags whose ID comes from a variable (lookup tables), and doesn't count consent-update triggers (`isConsentTrigger` in rules/helpers.ts) as re-fires: firing the Google tag on the consent update is the normal way to hold it back.
- GA4-07 (2026-11-10) doesn't flag a parameter on its name alone when the value is a built-in click variable ({{Click URL}} on a tel: link is the site's own number). GA4-08 is Housekeeping, worded as often intentional: different forms sending different fields under one event name is normal (Peter, 2026-11-10).
- RSK-06 also covers Google Optimize (`opt`, shut down September 2023). UA stopped processing July 2023 (July 2024 for 360); don't write "2024" alone.
- TRG-02 (2026-11-10) never flags `.*` in "Enable this trigger when" (autoEventFilter): GTM requires a condition there and `.*` means every page. `.*` in other conditions is Housekeeping (pointless, harmless); only won't-compile and never-true regex are Critical.
- Health score (2026-11-10): an area with nothing in it (GA4: no gaawe/googtag; Ads: no awct/sp/gclidw/awud/flc/fls) gets `score: null`, shown as "Not used", never a misleading 100 (`unusedAreas` in describe/score.ts).
- RSK-09 (added 2026-11-10): custom template no tag or variable uses. Housekeeping, definite. Seen in both of the first two client containers.
- RSK-08 (added 2026-11-09): marketing tags without built-in checks set to "No additional consent required". Warning, check-in-preview, neutral wording.
- Findings group into issues (one per rule) for counting and display; fingerprints stay per entity for History.

One file per rule: ID, default severity, container states it applies to, confidence (Definite / Check in Preview), passing and failing fixture. Severity: Critical = breaks data or legal exposure; Warning = probably wrong; Housekeeping = mess; Info = context. Rules are deterministic; the Claude API may write prose but never decides whether a finding exists.

## UI decisions

- Light (Bone) is the default theme (Peter, 2026-11-09, overriding the brief's Ink); a "Dark mode" switch (role="switch") selects Ink. "Check another container" is a quiet underline link at the foot of the page, not a header CTA.
- Header (Peter, 2026-11-09): one sticky row of brand, section nav and the Dark mode switch; navigation is the point of it. Container name and ID sit in the eyebrow above each view title. Version, export date and Legacy/Optimized/Mixed state live in an "About this export" note at the page foot: marketers don't need them up front.
- Severity: Critical = filled citrus badge with an **ink** label (white on citrus is 3.1:1 and fails AA); Warning = outlined pill; Housekeeping = mono label; Info = nothing. The word always shows.
- Event Map rows show only GA4 and trigger findings; container-wide consent/ads/hygiene issues live in Risks.
- Health score: per area, 100 minus fixed points per issue (Critical 30, Warning 10, Housekeeping 3, halved for Check in Preview). Explained in the UI via `SCORE_METHOD`.
- Focus moves to the view heading on load and view change; tables use `th scope`, rows expand via a button with `aria-expanded`. axe (WCAG 2.2 AA) reports no violations on every view as of 2026-11-09.
- Readability adaptation (2026-11-09): reading text is Space Grotesk Regular in `fg-body` (the marketing site's Light in `fg-muted` was hard to read at data-app sizes); display and large headings stay Light. Tables 15px.
- Two themes: Bone default, Ink via the header switch (localStorage, applied before paint by `lib/theme.ts`). `--mark` in app.css is citrus on Ink and citrus-deep on Bone; use it for any small citrus text, marks or focus rings, never raw `--citrus` (2.9:1 on bone). Filled citrus (Critical badge) is fine in both.
- Type (Peter, 2026-11-10): JetBrains Mono for code values (event and parameter names, IDs, {{variables}}, payloads). Mono letter-spaced caps (`.label-caps`) are an occasional accent only: the eyebrow above view titles ("Name: GTM-ID", colon not a dot), score-card area names, the brand's "GTM Auditor", the upload box label and the report cover. Everything else (`.label`, table headers, severity/confidence, counts, GTM menu paths) is Space Grotesk in sentence case. The design system's mono `.sl-field-label` is overridden in app.css. Tables use one text size: 15px sans, 14px mono (optically equal), including headers, in-cell labels and chips. Rule IDs (GA4-04…) never show in the UI or report; they stay in URLs (#risks/RULE-ID) and fingerprints.
- Overview summary (Peter, 2026-11-10): `overviewParts` in core returns sentences as parts; `components/SummarySentence.tsx` renders key facts with a highlighter band (`.fact`, citrus tint behind the lower half of the line, text keeps its colour) and links the ones with a view to open (`.fact-link`: events → #events, unused triggers → #triggers/unused, issue counts → #risks), underlined in `--mark` so links don't rely on colour. Keep marks few: counts of events, problems and unused items, and the container type. The report shows the same marks without links.
- `components/Highlight.tsx` renders quoted names and {{variables}} in finding and sentence text as mono chips, quoted setting names as bold, and (Overview only) counts in bold. It never changes the words.
- Export how-to lives in `components/ExportHowTo.tsx`, text only (screenshots dropped 2026-11-09).
- Scrollable table wrappers are focusable regions (keyboard scrolling). Every table sits on `--surface` (white on Bone), like cards and panels; expanded detail rows are inset on `--bg` in Bone. The header brand is the Sitelogic icon mark (`design/assets/sitelogic-icon.svg`, copied to `public/brand/` by the tokens script, used as supplied) plus "GTM Auditor".
- Printable report (2026-11-10): `components/Report.tsx`, hidden on screen and shown by print CSS (the "Report" item in the Download menu, or Cmd/Ctrl+P). Always Bone via `data-theme="bone"` on its wrapper. Cover, summary, scores, every non-info issue (why, fix, where, affected) and a GA4 events appendix. Affected lists collapse to names when every message has the same shape (`sentenceShape` in ui.tsx); fixes that differ only by a quoted example show once (`distinctTexts`, also used in Risks). Browser print-to-PDF, no server.
- Download menu (2026-11-10): `components/DownloadMenu.tsx`, a design-system Button (down arrow, no hover nudge) next to each view title that opens a disclosure list: Report (PDF via print), Issues (CSV, one row per finding), GA4 events (CSV, one row per event × tag × parameter; disabled when there are none). `lib/export.ts` builds CSVs in the browser with a UTF-8 BOM and guards cells starting with = + - @ against spreadsheet formula injection. Nothing is uploaded. Sharing for Sitelogic clients is via their sitelogic.app page (Peter, 2026-11-10); no server-side storage until History needs it.
- IconGridBackground isn't used yet (it ships in the design system's React bundle); upload screen is plain Ink for now.

## AI features

Optional and a later add-on. The Claude API may write prose (Overview paragraph, explaining a Custom HTML tag) but never decides whether a finding exists. Keep `packages/core` free of AI calls so audits stay deterministic.

## Copy

Second person, plain, a little dry. No emoji.

**No legal advice or legal verdicts.** Consent and privacy findings describe what the tag does ("fires whether or not the visitor has accepted marketing cookies") and point to whoever owns the site's consent or privacy policy. Never say something is illegal, a breach, non-compliant, or what GDPR or any law requires. Citing Google's own terms as a fact is fine. `test/engine.test.ts` enforces this across every rule's why/fix text; rule-specific messages need the same care. Fix paths use the new GTM navigation ("Advanced → Triggers") with the old path as fallback. Always "Sitelogic", never "Sitelogic Digital".
