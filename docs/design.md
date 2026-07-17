# Applying the FTA design system in the app

The full brand system lives in `design-system/` — read its `README.md` before building UI.
This doc covers how it translates to a **dense productivity app** (the source system was a
marketing site).

## Ground rules (non-negotiable brand)

- One accent: **gold `#E4AD25`** — primary buttons, active states, links, focus rings, key
  numbers (prices). Never flood; never introduce other accent hues.
- Ink `#0F0F0A` headings/emphasis; warm greys `--fg-2/--fg-3` for body/meta; white +
  `#F4F4F3` surfaces. Dark near-black reserved for the nav/footer chrome if used.
- **Hanken Grotesk** everywhere (700–800 headings, 400–500 body). Lora only for the
  wordmark. No emoji, ever. **Sentence case** for headings, labels, empty states; Title
  Case only on button labels.
- Radii: inputs/buttons 12–16px, cards 16–20px, pills full. Soft neutral shadows only.
- Icons: Lucide at 1.5–2px stroke in ink/gold + the supplied brand SVGs (arrows, social,
  discs). Status colours are functional only: Available green `#2DD443`; funding pills
  NHS = blue, Private = green, Mixed = magenta.
- Motion: 200–380ms ease-out fades/rises; respect `prefers-reduced-motion`.

## App-specific adaptations

- **Density**: marketing-site spacing is too airy for a CRM. Use a tighter data scale:
  14px base body in tables, 44px row height (compact toggle: 36px), 16–24px card padding.
  Keep the generous feel for headers, empty states, and dashboards.
- **Tables** are the app's core surface: white rows, hairline `#E7E7E4` dividers, hover
  wash, gold selected-state accents; sticky header; no zebra stripes.
- **Status pills**: rounded-full, tinted background + strong-text (not solid), colour from
  lookup config. Deal-tracker segments: achieved = green fill, current = gold pulse,
  upcoming = neutral outline.
- **Forms**: labels above, 16px-radius inputs, gold focus ring, inline Zod errors in a
  functional red (define `--danger` ~`#C4382D`; the brand system has no error red — this
  is an approved extension, documented here).
- **Record pages**: header band on white, tab nav as underlined tabs with gold active
  indicator, content on `--surface-2` with white cards.
- **Empty states**: brand-voice sentence + primary action ("No offers yet. Add the first
  offer when a buyer commits.") — calm, no illustration spam, no emoji.
- **Charts** (reporting): follow the `dataviz` skill; single-hue gold sequential for
  emphasis, neutral greys otherwise; deltas green/red only for direction.
- **Email shell** (campaigns): white body, FTA logo header, ink text, gold buttons/links,
  dark footer with company details + unsubscribe — mirror the website footer feel.

## Implementation

- Import `design-system/colors_and_type.css` tokens as CSS vars; map into Tailwind theme
  (`--color-gold`, surfaces, radii, shadows). Extend with app-only tokens (`--danger`,
  `--row-height`) in `src/styles/app-tokens.css` — never fork the brand file.
- Restyle shadcn primitives once, early (Phase 0): Button (primary gold/ink text, dark,
  outline-gold, ghost), Badge → pill recipes, Card, Tabs, Dialog, Toast.
- Copy needed brand SVGs into `public/brand/`; favicon from `design-system/assets/`.
- The design-system `ui_kits/website` JSX is a **marketing-site** reference — borrow feel,
  not layout.
