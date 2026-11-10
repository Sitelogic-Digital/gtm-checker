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
- TRG-02 does not flag lookaheads: web containers evaluate trigger regex as JavaScript. Unverified either way, so it isn't a finding.
- TRG-01 also covers a Google tag re-firing on non-page-load triggers without send_page_view=false.
- RSK-01 skips tag types with Built-In Consent Checks (`BUILT_IN_CONSENT` in rules/helpers.ts: Google types plus Microsoft UET `baut`, confirmed from the GTM UI) and CMP templates, and drops to check-in-preview when a consent-looking trigger gates the tag.
- RSK-02 is satisfied by a Google tag for an AW-/GT- ID as well as a Conversion Linker.
- GA4-06 isn't built: it needs the 2026 destination tag keys.
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
- `components/Highlight.tsx` renders quoted names and {{variables}} in finding and sentence text as mono chips, quoted setting names as bold, and (Overview only) counts in bold. It never changes the words.
- Export how-to lives in `components/ExportHowTo.tsx`, text only (screenshots dropped 2026-11-09).
- Scrollable table wrappers are focusable regions (keyboard scrolling). Every table sits on `--surface` (white on Bone), like cards and panels; expanded detail rows are inset on `--bg` in Bone. The header brand is the Sitelogic icon mark (`design/assets/sitelogic-icon.svg`, copied to `public/brand/` by the tokens script, used as supplied) plus "GTM Auditor".
- IconGridBackground isn't used yet (it ships in the design system's React bundle); upload screen is plain Ink for now.

## AI features

Optional and a later add-on. The Claude API may write prose (Overview paragraph, explaining a Custom HTML tag) but never decides whether a finding exists. Keep `packages/core` free of AI calls so audits stay deterministic.

## Copy

Second person, plain, a little dry. No emoji.

**No legal advice or legal verdicts.** Consent and privacy findings describe what the tag does ("fires whether or not the visitor has accepted marketing cookies") and point to whoever owns the site's consent or privacy policy. Never say something is illegal, a breach, non-compliant, or what GDPR or any law requires. Citing Google's own terms as a fact is fine. `test/engine.test.ts` enforces this across every rule's why/fix text; rule-specific messages need the same care. Fix paths use the new GTM navigation ("Advanced → Triggers") with the old path as fallback. Always "Sitelogic", never "Sitelogic Digital".
