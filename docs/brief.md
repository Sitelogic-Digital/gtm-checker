# GTM Container Auditor: Build Brief

Nov 4, 2026 · Peter Bender

## What we're building

A web app that takes a GTM container export (.json), explains what's inside in plain language, and flags problems with a bias toward GA4 events, parameters and the triggers that fire them. It should tell a user *what will break their data* before it tells them what's untidy.

The user knows what a tag and a trigger are. They've opened Preview mode. They probably couldn't explain why a GA4 event fires twice on a single-page app, or whether their Consent Mode setup actually blocks anything. They want a second opinion that doesn't make them feel stupid.

Two modes of use:

- **Client audits (now).** Sitelogic runs it on client containers during onboarding and QBR prep. Output needs to be shareable and branded.
- **Public tool (maybe later).** Same engine, self-serve upload, no account required for a single audit. Build with this in mind from day one so we don't rip out client-specific assumptions later.

Users will re-upload the same container over weeks or months. The tool should recognise it (by container public ID and account ID) and show what changed between versions, including new risks introduced and old ones fixed.

**Bar to clear:** GTM's built-in workspace notifications and Tag Diagnostics catch syntax-level problems in the live UI. They don't read a whole export, don't judge GA4 naming against the 40-character and 25-parameter limits, don't map which triggers feed which events, and don't track a container over time. That gap is the product.

## Context Claude Code needs first

The parser has to handle two generations of container: pre-2026 exports and containers that went through Google's 2026 optimization flow. Treat both as first-class. Most client containers in the next year will be unoptimized, and a meaningful number will be half-migrated, which is where the interesting bugs live.

### The export file

A GTM export is `{ exportFormatVersion, exportTime, containerVersion }`. Everything useful sits in `containerVersion`: `container` (publicId like GTM-XXXX, usageContext web/server/amp), `tag[]`, `trigger[]`, `variable[]`, `folder[]`, `builtInVariable[]`, `customTemplate[]`, plus `client[]` and `transformation[]` on server containers.

Things the parser must get right, from memory of the format (verify against real samples before writing the schema):

- Tags reference triggers by ID through `firingTriggerId[]` and `blockingTriggerId[]`. Folders link through `parentFolderId`. Build the graph from IDs, never from names.
- Tag config lives in a generic `parameter[]` array of typed nodes (`TEMPLATE`, `BOOLEAN`, `LIST`, `MAP`, `INTEGER`), nested. A GA4 event tag (type `gaawe`) keeps its event name in `eventName` and its parameters in `eventSettingsTable`, a LIST of MAPs. Parameters can also come from a shared Event Settings variable (`gtes`), so resolve those and merge.
- Values contain `{{Variable Name}}` references. Resolve them to the variable record, and flag references to variables that don't exist.
- Template tags and variables appear as `cvt_...` types that point at `customTemplate[]` entries. Keep the template's gallery reference so we can say "this is Stape's Meta CAPI template v2.3" rather than "unknown tag".
- `consentSettings.consentStatus` is `NOT_SET`, `NOT_NEEDED` or `NEEDED` with a list of consent types. Most risk flags around consent come from this field.

**Unknown types must never crash the parse.** Store them raw, show them as "Not recognised yet", and log the type key so we can add support.

### What changed in GTM in 2026

Google announced the merge of the Google tag and GTM on May 20, 2026, and the staged rollout began on August 20. The parts that matter for an auditor:

| Change | What it means for the auditor |
| --- | --- |
| New Destination tag types for Google Analytics, Google Ads and Floodlight, sending directly without loading gtag.js ([Stape](https://stape.io/news/google-tag-gtm-updates)) | New tag type keys to parse. A container with both a legacy Google tag and a GA4 destination for the same measurement ID is a likely double-send. |
| Container-level shared Settings that destinations inherit; destination tags can adjust some of them but can't bypass container restrictions ([Stape](https://stape.io/news/google-tag-gtm-updates)) | Settings now live outside individual tags. The parser needs to read them and show which tags inherit what. |
| Conversion Linker treated as legacy once destination tags handle its job ([Stape](https://stape.io/news/google-tag-gtm-updates)) | On an optimized container, a remaining Conversion Linker is cleanup, not a risk. On an unoptimized one, a missing linker is still a real problem. Same tag, opposite advice. |
| New snippets drop the `gtag('config')` line, and start-up is controlled by a new `init` trigger, which can also be set to wait for the config command to keep a legacy setup ([Google](https://support.google.com/tagmanager/answer/17079602?hl=en)) | New trigger type to understand. Flag containers that rely on the config-wait mode as transitional. |
| "Manage data transmission settings" can delay sends until consent, allow limited ad data, or block ad requests until ad\_storage is granted ([Stape](https://stape.io/news/google-tag-gtm-updates)) | Consent behaviour can now be set at container level, so a tag with `NOT_SET` consent isn't automatically a gap. Check both layers before flagging. |
| Optimization is opt-in; nothing changes automatically ([Google](https://support.google.com/tagmanager/answer/17079602?hl=en)) | Detect and label the container state: Legacy, Optimized, or Mixed. Every rule should know which state it's in. |
| Linking a Google tag can grant its users Read access to the GTM container ([Stape](https://stape.io/news/google-tag-gtm-updates)) | Not visible in the export. Mention it in the migration checklist, don't pretend to audit it. |

The UI moved Triggers, Variables, Templates and Folders under a collapsible Advanced section. Our copy should use the new navigation paths ("Advanced → Triggers") when telling users where to fix something, with the old path as a fallback.

> **Update 2026-11-04:** No optimized or mixed exports are available yet, and most target users have legacy containers like the first sample. Build legacy-first; the parser flags unexplained signals (`state.unexplainedSignals`) so the first real optimized export can fill the 2026 catalog.

**First task for Claude Code:** I'll supply five or six real exports (legacy, optimized, mixed, one server container, one messy client container). Build the parser and type definitions against those before writing any rules. The destination tag and Settings keys aren't documented anywhere I trust yet.

### GA4 limits the rules enforce

From Google's [event collection limits](https://support.google.com/analytics/answer/9267744?hl=en): event names max 40 characters, 25 parameters per event, parameter names max 40 characters, values max 100 characters (page\_title 300, page\_referrer 420, page\_location 1,000). User properties: 25 per property, names max 24 characters, values max 36. A key event over 40 characters won't report as a key event. These can't be raised with 360, so they're hard errors, not warnings. Store them in one config file with a source URL and a `verifiedOn` date.

> **Correction (verified 2026-11-04):** Google's page says 360 can raise "certain limits (but not event/parameter character limits)". The character limits are fixed; the 25 parameters per event and 25 user properties *can* be raised with 360. See `packages/core/src/config/ga4-limits.ts`.

## Core features

Six views, in the order a user meets them. The GA4 Event Map is the centrepiece and should get the most build time.

### 1. Import

Drag and drop a .json export. Validate it's a GTM export before anything else, and give a human error if not ("This looks like a GA4 property export, not a GTM container"). Parse in the browser first so nothing leaves the machine until the user chooses to save. Show the container ID, version number, export date and the detected state: **Legacy**, **Optimized** or **Mixed**.

Later (phase 3): connect to the GTM API with OAuth and pull the live or workspace version directly, so users stop exporting by hand.

### 2. Overview

One screen, written as sentences, before any tables. Something like: "This container sends 14 GA4 events to 2 measurement IDs. 3 tags are paused and 11 triggers aren't used by anything. We found 2 critical issues, both about consent."

Then counts by tag type, folder and owner, a health score per area (GA4, triggers, consent, hygiene), and the top five findings. The score should be explainable in one click. A black-box number will get argued with in every client meeting.

### 3. GA4 Event Map (the main thing)

One row per event name, not per tag. Several tags can send the same event, and that's exactly what users can't see in GTM.

Each row shows the event name, the tag or tags sending it, the destination measurement ID, the triggers in plain English, every parameter with its source (Data Layer variable, constant, URL, custom JS, shared Event Settings), and its findings. Expanding a row shows a parameter table and a "what this sends" preview: a mock payload with variables shown as placeholders.

A second tab pivots the other way: **Parameters**. Every parameter name across the container, which events use it, where its value comes from. This is where `form_name` vs `formName` vs `form_id` shows up, and that inconsistency is the most common mess we inherit.

If the user has GA4 access, a later phase pulls registered custom definitions through the GA4 Admin API and marks parameters that are sent but never registered. DebugView-shows-it-but-reports-don't is the single most common GA4 support question, and no built-in tool connects the two.

### 4. Triggers

Every trigger rendered as a sentence: "Fires on every link click where Click URL contains /thank-you, except on pages where Page Path equals /admin." Include blocking triggers, trigger groups and the new init trigger.

Show what each trigger feeds, and flag triggers that feed nothing. For Custom Event triggers, list event names that look like near-duplicates (`form_submit` and `formSubmit`), because a data layer push with the wrong casing silently fires nothing.

### 5. Risks

Everything that could break data, slow the site, or create privacy exposure, across all tag types: Custom HTML, third-party templates and their permissions, consent gaps, dead Universal Analytics tags, PII patterns, hard-coded IDs. Each finding carries severity, a plain explanation, why it matters, how to fix it with the new UI path, and a **confidence** marker: *Definite* (provable from the JSON) or *Check in Preview* (likely, but depends on the site). Being honest about what a static file can't prove is how this beats the competition.

### 6. History

When a user uploads a container we've seen before (same account and public ID), show a diff against the previous upload: tags added, removed and changed (with field-level detail), plus findings introduced and findings resolved. A small line chart of open findings by severity over time sits on the container's home page. This is the bit clients will screenshot.

### Report

A read-only shareable link and a PDF export, both Sitelogic-branded for client work and unbranded (or lightly branded) in the public version. Every finding links back to its entity in the app.

## Rules engine

Rules are code, one file each, with an ID, default severity, the container states it applies to, and fixture tests. Severity means one thing: **Critical** breaks data or creates legal exposure, **Warning** is probably wrong, **Housekeeping** is mess, **Info** is context. Resist the urge to make everything Critical. A report with 40 red flags gets ignored.

Starter catalog for v1. Claude Code should build these first and add more only with a fixture that proves the rule works.

| ID | Rule | Severity | Applies to | Confidence |
| --- | --- | --- | --- | --- |
| GA4-01 | Event name over 40 characters, or starts with something other than a letter | Critical | All | Definite |
| GA4-02 | More than 25 parameters on one event, counting shared Event Settings | Critical | All | Definite |
| GA4-03 | Parameter name over 40 characters or with invalid characters | Critical | All | Definite |
| GA4-04 | Reserved event name (session\_start, first\_visit, user\_engagement and others) or reserved prefix (google\_, ga\_, firebase\_) | Critical | All | Definite |
| GA4-05 | Purchase without transaction\_id or items, or value sent without currency | Critical | All | Definite |
| GA4-06 | Legacy Google tag and a GA4 destination tag both sending to the same measurement ID | Critical | Mixed | Check in Preview |
| GA4-07 | Parameter looks like PII (email, phone, name fields, or page\_location fed from a URL with query strings) | Critical | All | Check in Preview |
| GA4-08 | Same event name sent by several tags with different parameter sets | Warning | All | Definite |
| GA4-09 | Near-duplicate parameter names across events (casing, underscores, obvious synonyms) | Warning | All | Definite |
| GA4-10 | Custom event that duplicates a recommended event (lead\_submit instead of generate\_lead) | Warning | All | Definite |
| GA4-11 | Measurement ID typed into several tags instead of one variable or the container Settings | Housekeeping | Legacy | Definite |
| TRG-01 | All Pages and History Change both feeding page\_view tags (double counting on SPAs) | Warning | All | Check in Preview |
| TRG-02 | Regex that won't compile, or matches everything | Critical | All | Definite |
| TRG-03 | All Clicks or All Elements trigger with no conditions feeding a GA4 event | Warning | All | Definite |
| TRG-04 | Custom Event trigger names that differ only by case or separators | Warning | All | Definite |
| TRG-05 | Form Submission trigger with Check Validation off | Warning | All | Check in Preview |
| TRG-06 | Trigger not used by any tag | Housekeeping | All | Definite |
| RSK-01 | Ads or marketing tag with consent NOT\_SET and no container-level data transmission rule | Critical | All | Definite |
| RSK-02 | Ads conversion tags with no Conversion Linker | Critical | Legacy | Definite |
| RSK-03 | Conversion Linker still present after optimization | Housekeeping | Optimized | Definite |
| RSK-04 | Custom HTML that injects scripts from unrecognised domains or uses document.write | Warning | All | Check in Preview |
| RSK-05 | Community template with broad permissions (inject any script, read globals, send pixels anywhere) | Warning | All | Definite |
| RSK-06 | Universal Analytics tags still in the container (UA stopped processing in 2024) | Housekeeping | All | Definite |
| RSK-07 | Variable referenced in a tag or trigger but not defined | Critical | All | Definite |

Note how RSK-02 and RSK-03 give opposite advice about the same tag. That's why every rule declares its container state.

### Sitelogic conventions (slot for your list)

Naming, folder and ownership rules live in a separate **ruleset** file, not in code, so the public version can ship Google-only defaults and Sitelogic (or a client) can load stricter ones. Suggested shape, one entry per rule:

```json
{
  "id": "SL-NAME-01",
  "title": "Tag names follow Platform - Type - Detail",
  "appliesTo": "tag",
  "check": { "field": "name", "pattern": "^(GA4|GAds|Meta|LinkedIn) - [A-Za-z]+ - .+$" },
  "severity": "Housekeeping",
  "fix": "Rename to e.g. GA4 - Event - generate_lead"
}
```

When you send your recommendations, I'll convert them into this format. Most naming rules are a regex on a field. Folder rules ("every GA4 tag lives in a GA4 folder") need a small check type for parent folder. Anything fuzzier, like "one folder per vendor", becomes a custom check function with its own fixture.

Let users switch rulesets per audit and show which one was used on the report. A client audited against Sitelogic conventions and then against defaults should get two clearly labelled results.

## Stack and architecture

Vercel and Neon cover everything through phase 2. Railway only comes in when we need jobs that run longer than a serverless function allows.

*(Architecture diagram in the original brief: phase 1 solid, phase 3+ dashed.)*

The parser and rules run in the browser, so a public user can audit a container without it ever reaching our servers. Saving sends the raw file and the findings up.

### Repo layout

A pnpm monorepo with Turborepo. `apps/web` is the Next.js App Router app. `packages/core` holds the parser, entity graph and rule engine with zero runtime dependencies, tested with Vitest against the fixture exports. `packages/rulesets` holds the JSON rulesets. Keeping core pure means the same code runs in the browser, in server actions and later in the Railway worker.

### Services

- **Vercel:** hosting, preview deploys, Blob for raw exports (private access only).
- **Neon:** Postgres with Drizzle ORM. Use the Vercel integration so each preview deploy gets its own Neon branch.
- **Auth:** Google sign-in, restricted to the Sitelogic Workspace domain in phases 1 and 2. Clerk is the safe pick; Neon Auth is worth a look since it keeps users in the same database.
- **Railway (phase 3+):** a Node worker for scheduled GTM and GA4 API syncs and Playwright live checks. Jobs go through a Postgres-backed queue (pg-boss) so we don't add Redis for one feature.
- **Claude API (optional):** writes the plain-English Overview paragraph and explains what a Custom HTML tag does. It never decides whether a finding exists. Rules are deterministic, and a report has to give the same answer twice.

### Data model

| Table | Holds |
| --- | --- |
| `client` | Sitelogic client, or the public user's workspace |
| `container` | Unique on accountId + publicId; usage context; display name |
| `container_version` | One per upload: exportTime, versionId, detected state, Blob key, ruleset used |
| `entity_snapshot` | Normalised tags, triggers, variables, folders as jsonb, per version |
| `finding` | Rule ID, entity ref, severity, confidence, message, and a stable fingerprint |
| `accepted_risk` | Finding fingerprint, note, who accepted it, when |
| `share_link` | Version, random token, expiry |

The finding fingerprint is a hash of rule ID, the entity's GTM ID and the detail that triggered it. That's what lets History say resolved since last upload instead of showing two unrelated lists.

### Privacy

Container exports often hold measurement IDs, API keys pasted into Custom HTML, and occasionally PII in lookup tables. Treat them as client confidential: private Blob, no logging of file contents, delete on request, and a retention setting per client. For the public tier, default to not storing anything.

## UX and the Sitelogic design system

Build on the [Sitelogic design system](https://claude.ai/artifact/KnqidfGYVefjnPyqPH8rbL). Copy its `tokens.json`, fonts and `components/bundle.css` into the repo under `/design` and generate CSS variables (or a Tailwind theme) from the tokens. Don't hand-copy hex values; the tokens file is the source of truth.

### What carries over as-is

- **Themes.** Ink for the app itself. Bone for the shareable report and the PDF, because clients print these and a black page burns toner and goodwill.
- **Type.** Space Grotesk for reading text, JetBrains Mono for anything technical: event names, parameter names, tag types, IDs, regex. Mono is a natural fit here and makes the GA4 view scannable. Uppercase mono eyebrows for section labels and severity labels.
- **Shape.** The Sitelogic corner (16px top-right and bottom-left) on cards and panels. Pill buttons, outlined, with the arrow badge. Hairline borders, flat surfaces, no shadows except menus.
- **States.** Citrus focus ring, 2px, 3px offset, on everything. This matters more in a data app than on the marketing site because people will tab through tables.
- **Voice.** Second person, plain, a little dry. "This tag fires on every click on the site. You probably wanted it on the Submit button only." No emoji anywhere.

### What needs adapting

The system was built for a marketing site. Display sizes run to 124px and there are no data components. For the app, cap headings at `h3-lg` and live mostly in `h4`, `body`, `small` and `eyebrow-sm`. Keep `display-page` and the `IconGridBackground` for the upload screen only. Never behind tables or findings.

Components we'll need that don't exist yet: data table (sortable, sticky header, expandable rows), tabs, severity badge, filter chips, a diff view, a code/JSON viewer, a trigger-condition "sentence" block, toasts and an empty state. Build them in the system's language (hairlines, mono labels, the corner on containers but not on table rows) and plan to add them back to the design system once they've settled.

### Severity colour: needs your call

The system has one accent, citrus, and explicitly no other tints. An audit tool usually wants red, amber and grey. My recommendation is to stay inside the system:

| Severity | Treatment |
| --- | --- |
| Critical | Filled citrus badge, label in white; on bone use `citrus-deep` for any small text (citrus is only 2.9:1 there) |
| Warning | Outlined badge in `fg`, `border-control` outline |
| Housekeeping | Mono label in `fg-subtle`, no badge |
| Info | No label, just the finding text |

The word always appears with the badge, so nothing depends on colour alone. If you'd rather add an amber for Warning, that's a design system change and should go through the system, not get hard-coded in this app.

### Accessibility

WCAG 2.2 AA throughout. Tables must work with a keyboard and screen reader (proper `th` scope, row expansion via button, not row click). Respect `prefers-reduced-motion` for the page entry and reveal animations.

## Build plan

Ship the client version in phases 0 to 2. Phase 3 is where it becomes a public product, and it's fine if that slips.

1. **Phase 0: Parser and fixtures.** Collect the sample exports, write the TypeScript types, build the parser and the entity graph (tags, triggers, variables, folders, templates and their ID links). No UI beyond a debug page.
   - Gate: all samples parse; counts per entity type match what the GTM UI shows for those versions; unknown types are captured, not dropped.
2. **Phase 1: MVP for Sitelogic.** Upload, Overview, GA4 Event Map with the Parameters tab, Triggers as sentences, Risks with the starter catalog, a shareable report link. Team login only.
   - Gate: run on five real client containers. A person checks every Critical and Warning finding. Under 10% false positives, zero missed Criticals that we already knew about.
3. **Phase 2: Over time and our conventions.** Container history and diffs, the ruleset loader with Sitelogic conventions, PDF export, findings marked "accepted risk" with a note so they stop nagging.
   - Gate: upload two versions of the same container and get a correct diff, including renamed tags (match on tag ID, not name).
4. **Phase 3: Connected and public.** GTM API import via OAuth, GA4 Admin API check for unregistered parameters, anonymous single-audit mode, rate limiting, privacy page.
5. **Phase 4 (maybe): Live verification.** A Railway worker loads the site in a headless browser, records the hits that actually fire, and upgrades "Check in Preview" findings to confirmed or cleared. This is the feature no one else has, and it's also the one most likely to eat a month.

### Backlog: event builder (phase 3+)

A guided form for creating new GA4 events: event name, trigger, parameters and their sources. It validates as the user types against the GA4 limits and the active ruleset, so new events arrive already following our conventions.

Output, in order of preference:

1. **GTM API (needs phase 3 OAuth).** Create the tag, trigger and variables in a new workspace named like `Auditor: add generate_lead`. Never publish. The user reviews the change in GTM and publishes it themselves.
2. **Import file (fallback).** A partial container JSON holding only the new event and its dependencies, for users who won't connect their account.

Guardrails:

- Never offer or encourage Overwrite. Import instructions say Merge, then **Rename conflicting** tags, triggers and variables.
- Generate unique names for everything we create (a consistent prefix or suffix) so a merge can't replace an existing item even if someone picks the wrong option.
- Include every dependency: trigger, Data Layer variables, and the link to the measurement ID. Build the tag in the right shape for the container's state (legacy Google tag reference vs optimized destination and Settings).
- Re-run the full audit on the container plus the new event before export, and block export on any Critical finding.

Cheap interim step for phase 2: on findings like GA4-10, show a read-only "what the fixed tag should look like" panel. Same UI thinking, nothing written to the container.

### Definition of done for v1

- [ ] Parses legacy, optimized and mixed containers without errors
- [ ] Every starter rule has a passing and a failing fixture
- [ ] Every finding shows why it matters and where to fix it in the new GTM navigation
- [ ] Nothing from an uploaded container is stored until the user saves the audit
- [ ] Report link works logged out and is unguessable
- [ ] Lighthouse accessibility score of 100 on Overview and Event Map

### Open questions

- [ ] Your naming, folder and ownership conventions (send the list and I'll turn it into ruleset entries)
- [x] Do we need server-side containers in v1, or web only? **Decided 2026-11-04: web containers only, permanently. Server, AMP and app containers are rejected at import with a plain message; they're beyond the target audience.**
- [ ] Public version: free with no login, or email-gated? This decides how much of phase 3 is auth work
- [ ] Product name. "GTM Auditor" is taken a dozen times over. (Packages use the placeholder `@gtm-audit/*` for now.)
- [ ] Severity colours: stay with citrus-only, or extend the design system with an amber?
