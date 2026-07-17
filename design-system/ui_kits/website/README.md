# FTA Website UI Kit

A high-fidelity, interactive recreation of the **Frank Taylor & Associates** marketing homepage,
built from the supplied full-page screenshot (no codebase/Figma was provided). Components are
cosmetic React recreations — modular and reusable for assembling new FTA pages and mocks.

## Run
Open `index.html`. It loads `../../colors_and_type.css`, `../../components.css`, and `kit.css`,
then mounts the React app. All imagery/icons resolve from the design-system `../../assets/`.

## Components
| File | Exports | What it covers |
|---|---|---|
| `Nav.jsx` | `Nav` | Sticky top bar: gold wordmark plate, nav links w/ carets, WhatsApp chip, "Book Valuation" outline button. |
| `Hero.jsx` | `Hero` | Rounded hero with scrimmed room photo, headline, and the floating Buy/Sell search panel (interactive toggle + input). |
| `PracticesSection.jsx` | `SectionHead`, `PracticesSection` | "Latest practices for sale" — 3 practice cards with status pills, fee/asking prices. |
| `ArticlesSection.jsx` | `Carousel`, `ArticlesSection` | "Latest Articles" gold-outline cards in a working arrow carousel. |
| `MidSections.jsx` | `PromoCards`, `JourneySection`, `AboutSection` | Value/Member promos, the 4-up "Your journey" feature row, and the About split. |
| `GuidesCta.jsx` | `GuidesSection`, `CtaBanner` | Guides carousel (photo + tip badge) and the gold "Ready to take the next step?" banner. |
| `StoriesContact.jsx` | `StoriesSection`, `ContactSection` | Video-still story tiles, testimonial quote cards + Google rating, and the 4 contact cards. |
| `Footer.jsx` | `Footer` | Near-black footer: brand plate, social discs, 6 link columns. |

## Interactions implemented
- Hero **Buy / Sell** toggle (active state swaps gold/dark).
- **Carousels** (articles, guides) with working prev/next arrows + disabled end-states.
- Hover lifts on every card; button hover/press states from `components.css`.

## Fidelity notes
- Recreated from a **screenshot only** — spacing/type are matched by eye, not lifted from source.
- The heading typeface is approximated with **Hanken Grotesk** (see root README *Font substitution*).
- Story tiles reuse the supplied thumbnail stills as stand-ins for the real portrait video frames.
- The "Journey" feature icons use the supplied neutral-disc icon SVGs; promo icons use the gold-disc SVGs.
