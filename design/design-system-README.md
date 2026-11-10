Organic visibility for a changing search landscape. Sitelogic looks like its website: an ink-black ground, bone-white display type set large and Light, citrus as the only accent, and mono labels. Surfaces are flat and held by hairlines. Cards carry one signature shape: 16px on the top-right and bottom-left corners, square on the other two. Always write the name as **Sitelogic**.

## Content fundamentals

Confident, clear, a little dry. Write to marketing leaders, not about them. Use active verbs and short clauses, and never invent performance numbers.

- **Second person.** Speak to the reader and their organization: "Your CEO wants one number. Your CFO wants another."
- **Concede, then position.** Acknowledge reality before the pitch: "Traditional organic search hasn't gone away."
- **Name the tension, then resolve it.** "Some of it's noise and some of it's a big deal. We help you navigate it."
- **Promises are short and concrete.** "Your site's staying. Let's make it earn more." "The right foundation before the build begins."
- **Casing.** Headings in sentence case, often questions or short declaratives with a period ("Get better visibility."). Mono labels in UPPERCASE. Article titles keep their own title case.
- **No emoji.** The only glyphs are → and the `+` list marker.

The three disciplines are **SEO**, **AI Search (GEO/AEO)** and **Analytics**. The three services are **Audit & Action Plan**, **Audit & Discovery** and **Growth**. The four lenses are **Business, Brand, User, Bot**.

## Visual foundations

### Color and themes

- Two themes. **Ink** (`ink` #0A0A0A) is the default for the homepage, about, contact and footer. **Bone** (`bone` #FDF8EB) is for light sections ("Tools & tests") and whole service pages. Use semantic tokens so a component works in both.
- `bg` is the page ground and `surface` fills cards and rows (ink on ink, white on bone). Rows and cards hover to `surface-hover` (`ink-2` #111111). Menus sit on `surface-raised` (`ink-3`).
- Text on ink is **white at opacity**, not grey: `fg` 100% for headings, `fg-body` 85% for lists and hero copy, `fg-muted` 65% for paragraphs, `fg-subtle` 55% for meta. On bone the same roles use ink at 80% and 65%, and `ink-muted` (#6B6B6B).
- Hero headlines use `fg-display`: bone on ink, ink on bone.
- `citrus` (#FF595A) is the only accent. Use it for arrow badges, mono service and category labels, `+` markers, hover states and focus rings. Hover fills go to `citrus-hover`. On bone, citrus is 2.9:1, so use it for marks, borders and hover color, never for small copy.
- Hairlines: `border` (10%) for cards and row dividers, `border-strong` (15%) for column dividers and the newsletter input, `border-control` (25%) for button outlines.
- Muted text: the theme defines solid `bone-muted` (on ink) and `ink-muted` (on white and bone), tuned for WCAG AA, to replace low-opacity text. Pages still use the opacity tokens (`fg-muted`, `fg-subtle`), which also pass AA on their own grounds. For new work on a raised surface (`ink-2`, `ink-3`) or over imagery, use the solid ones.
- `silver` (#B2B4B8) is only the cool orb light in `IconGridBackground`, never a UI color.
- Extra palette tokens defined in the theme but not seen on the pages: `citrus-soft` (tint), `citrus-deep` (the AA-safe citrus for small text on bone or white, 5.2:1) and `bone-2` (a deeper bone panel).
- There are no gradients, and no blue or grey tints.

### Type

- **Space Grotesk** (Light 300, Regular 400, Medium 500) for everything you read, with `ss02` and `ss03` on everywhere. **JetBrains Mono** for labels. Bold is not used.
- **Display** is always Light with −0.04em tracking and 0.9 line height: `display` (56–124px) on the homepage, `display-page` (48–100px) on inner pages, and `display-cta` (48–96px, −0.025em) for the closing "Get better visibility."
- **Headings:** `section-title` 60px Light (48px below 1024px). `h2` defaults to 30px/48px Light at 1.25. `h3-lg` 24/36px and `h3` 20/24px are Medium. All headings track −0.025em (`letter-spacing-display`).
- **Body:** `body` 16px Light at 1.625 in `fg-muted`; `lead` 20px Light at 1.375 under page heroes; `small` 14px for card copy. In bone sections, paragraphs render at Regular 400.
- **Mono:** `kicker` is 16px Medium uppercase at 0.08em in citrus, above the hero headline. `eyebrow` (14px) and `eyebrow-sm` (12px) are uppercase labels tracked at 0.18em, the theme's `letter-spacing-eyebrow`.

### Layout and spacing

- Tailwind's 4px scale; token names match the utility numbers (`space-6` = 24px = `px-6`).
- Pages are padded by `gutter` (56px) at 768px and up, `gutter-sm` (24px) below, and centered at `max-width` 1440px.
- Homepage sections pad `space-24` (96px) on mobile and `section-pad` (160px) on desktop. Inner pages pad 80/112px; closing CTAs pad 160/224px.
- A section opens with a `SectionHeader`, then `space-20` (80px) before its content on desktop.
- The fixed header is transparent over the hero.

### Shape and elevation

- **The Sitelogic corner:** `border-radius: 0 var(--radius-2xl)`, meaning 16px on the top-right and bottom-left only. Use it on cards, resource lists, image frames and contact fields.
- Buttons and badges use `radius-pill`. Only the newsletter input uses `radius-md` (6px).
- The site is flat. The only shadow is `shadow-menu`, on the header dropdown.
- The corner mirrors the logo mark's shape. In code it's the `sl-radius` utility.

### Motion

- The signature easing is `cubic-bezier(.22,1,.36,1)`. Utility transitions use `cubic-bezier(.4,0,.2,1)`.
- Durations: color changes 150–200ms; the arrow badge 260ms (nudges 3px right and fills citrus); card lift and row hover 300ms; the header menu 240ms (fade plus 8px drop); scroll reveals 650ms fade with a 747ms 20px rise, staggered 80ms; page entry 520ms from a 10px blur at 70% opacity (off under `prefers-reduced-motion`). The marquee strip loops every 40s.
- Cards lift 4px (`translateY(-4px)`) and turn their border citrus. Hero columns dim to 80%, with an arrow sliding in.
- The hero and page-header backdrop is `IconGridBackground` (see Backgrounds): a slow diagonal pan, orbs that cross the field in about two minutes, and a 13-second breathing pulse.

### Backgrounds

- The standard background is `IconGridBackground`: the brand mark tiled on an 80px grid, lit by drifting orbs of `citrus`, `silver` and `citrus-deep`. Use it behind every hero and page header instead of a flat ground or a static pattern.
- Pick the variant by page: `home` (homepage hero), `interior` (About, Expertise, Tools detail), `warm` (Contact), `minimal` (Work, Resources, legal) and `bone` (How We Work, Academy, Expertise detail). The dark variants sit on `ink`; `bone` sits on `bone`.
- Each variant has a quiet zone left of center that dims the grid. Set the headline there, left-aligned, so the orbs never cut into it.
- One grid per view. Never put it behind cards, forms or long body copy.
- It freezes under `prefers-reduced-motion` and drops the cursor light on touch screens on its own.

### States

- Focus: `outline: 2px solid` citrus, 3px offset, 2px radius, on every element (full-width rows use an inset ring).
- Hover: button outlines go to `fg`; links go to citrus or `fg`; rows fill `surface-hover`.
- Selection: citrus background, white text.

## Components

- `Button`: the outlined pill with an arrow badge, in `sm`, `md` and `lg`. It is the only button style.
- `ArrowLink` ("Open tool" plus badge) and `UnderlineLink` ("Explore →" on a citrus hairline).
- `Card`: tool card with the Sitelogic corner, lift and citrus border.
- `ServiceRow`: service name, promise, description and "Typically includes" list.
- `ColumnList`: the hero's three divided expertise columns.
- `ResourceList`: bordered article rows.
- `SectionHeader`: the 60px heading with a "View all →" link.
- `TextField`: mono-labelled field, `boxed` or `newsletter`.
- `IconGridBackground`: the animated brand-mark grid behind heroes, in five variants.

## Iconography

- Use the supplied marks and never redraw them. The site header uses `sitelogic-wordmark-reversed.svg` on ink; use `sitelogic-wordmark.svg` on bone or white. The icon mark is always citrus.
- UI glyphs are the arrow → (plain or in the arrow badge), `+` markers, and a small chevron in the nav. The site draws a handful of inline SVG icons rather than using an icon library.
- No emoji.
