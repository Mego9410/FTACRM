# Frank Taylor & Associates — Design System

A design system for **Frank Taylor & Associates (FTA)**, the UK's leading independent dental
practice sales agency. FTA specialises in **valuations, sales, acquisitions and business-improvement
consultancy** for dental practice principals across England and Wales — guiding owners calmly and
confidentially from first valuation to final signature.

> "The UK's leading independent dental practice sales agency. Guiding practice owners with integrity
> since 1990." — site footer

The brand voice is **reassuring, expert and seller-first**: confidential, premium and human, with a
warm editorial feel anchored by a single signature **gold (#E4AD25)** against near-black ink and
generous white space.

---

## Sources provided

This system was reconstructed from materials supplied by the user (the reader may not have access —
recorded here for traceability):

- **Full-page website screenshot** — `uploads/screencapture-digimax-uk-projects-fta-2026-06-02-11_53_14.png`
  (a staging build at digimax-uk → projects → *fta*). This is the primary source of truth for layout,
  colour, type and components.
- **Brand wordmark** — `uploads/frank-taylor-and-associates-logo.png` (gold plate, serif lettering).
- **Photography / thumbnails** — `about-thumb.png`, `banner-bg.png`, `thumb1-3-*.png` (guides & story stills).
- **Icon set** — ~40 hand-built SVG icons (social, arrows, status, feature discs). See **Iconography**.
- `favicon.ico`.

> ⚠️ No codebase or Figma file was provided — only a rendered screenshot + raw assets. Component
> recreations are therefore high-fidelity *visual* reconstructions, not lifted source. Flag any pixel
> the team wants tightened.

---

## What's in this folder (index)

| File / folder | What it is |
|---|---|
| `README.md` | This document — context, content & visual foundations, iconography. |
| `colors_and_type.css` | All design tokens: colour vars, type scale, radii, shadows, spacing, motion. |
| `components.css` | Reusable component primitives: buttons, badges/pills, cards, inputs. |
| `SKILL.md` | Agent-Skills manifest so this system works inside Claude Code. |
| `assets/` | Logo, photography, `favicon.ico`. |
| `assets/icons/` | The full SVG icon set (social, arrows, status, feature discs). |
| `preview/` | Small HTML specimen cards that populate the **Design System** tab. |
| `ui_kits/website/` | High-fidelity, interactive recreation of the FTA marketing site + JSX components. |

---

## CONTENT FUNDAMENTALS

**Voice** — Calm, authoritative, reassuring. FTA positions itself as the trusted expert who removes
uncertainty. Copy leads with the seller's interests ("seller-only representation", "no buyer fees, no
conflicts"). Confidentiality is a recurring promise.

**Person & address** — Second person, speaking *to* the owner: "Helping **you** buy or sell **your**
dental practice", "Find out how much **your** practice is worth", "**Your** journey with Frank Taylor &
Associates". The firm refers to itself as "we"/"Frank Taylor & Associates" / "FTA".

**Casing** — **Sentence case everywhere** for headings and buttons — *not* Title Case.
Examples: "Latest practices for sale", "Real outcomes from real sellers", "Ready to take the next
step?". A handful of CTAs use Title Case on the website's buttons ("Book Your Free Valuation", "View All
Practices", "Start Your Journey Today") — treat Title Case as reserved for **button labels**, sentence
case for **headings and body**.

**Tone of headings** — Plain-spoken and benefit-led, often a full sentence or a question:
- "Helping you buy or sell your dental practice with confidence and maximum value"
- "Do you want to explore selling your practice without committing to anything or alerting anyone?"
- "Ready to take the next step?"

**Supporting copy** — One short, plain sentence under each heading. No jargon, no hype.
- "A trusted, confidential partner for buying and selling dental practices, at the right time and the right price."
- "Over thirty years of experience guiding dental practice owners through successful sales."
- "Fresh insights and practical advice to help you navigate buying and selling."

**Microcopy & CTAs** — Action-first, short: *Book Valuation · Book Your Free Valuation · View All
Practices · View Details → · Read Article → · Claim Your FREE Guide → · Get Early Access → · WhatsApp Us
· Call Now · Start Your Journey Today*. Arrows (→) trail most CTAs and links.

**Numbers & proof** — Used sparingly and concretely: "5,000+ vetted buyers", "Over thirty years",
"4.8 ★ 119 Google reviews", "since 1990", real reference numbers (Ref. 14-01-3449) and prices
(£1,371,947). Trademark flourish appears once: "owner fatigue™".

**Emoji** — **None.** Never use emoji. Iconography does all the visual-shorthand work.

**Vibe** — Premium but unstuffy; trustworthy family-firm professionalism. Think discreet advisor, not
aggressive estate agent.

---

## VISUAL FOUNDATIONS

**Overall feel** — Editorial, airy, premium. A single warm gold does all the accenting against
near-black ink on white, with one alternating light-grey band (`--surface-2`) to separate sections.
Lots of white space; wide `1200px` content column.

**Colour**
- **Gold `#E4AD25`** is the one brand colour — used for: solid buttons, the logo plate, CTA banner,
  circular feature-icon discs, link text, stars, arrows, the active "Buy" toggle, and 1px outline
  borders. Use it as a precise accent, never as a flood.
- **Ink `#0F0F0A` / true black `#090909`** — headings, the "Sell" toggle button, and the **footer**
  (a full near-black band).
- **Warm greys** for body (`--fg-2 #5E5E5A`) and meta (`--fg-3`).
- **Surfaces**: white default, `#F4F4F3` alternating band, `#EFEFEE` practice-card fill.
- **Status colours** are functional only: Available green `#2DD443`, NHS = blue pill, Mixed = magenta
  pill, Private = green pill. Never decorative.
- No bluish-purple gradients. No rainbow. The palette is disciplined: gold + ink + grey.

**Typography**
- One **neutral grotesque** carries the whole site — headings are heavy (700–800, tight `-0.02em`
  tracking, sentence case) and body is the same family at 400–500 in warm grey. We use **Hanken
  Grotesk** as the closest Google-Fonts match (see *Font substitution*).
- The **wordmark** is set in a classic transitional **serif** (gold-on-plate). We pair **Lora** as the
  serif accent. Serif is reserved for the logo / rare editorial flourish — body & UI are all sans.

**Backgrounds** — Mostly flat white / flat light-grey. Photography appears as **framed, rounded blocks**
(hero room shot with a dark overlay; about = London skyline; guide/story stills). No repeating
patterns, no textures, no big gradients. The hero photo carries a subtle dark scrim so white text reads.

**Imagery vibe** — Warm, natural, professional: real UK dental settings and smiling clinicians, full
colour, soft natural light. London skyline for "About". Guide cards use clinician photos with a small
gold "Selling Tips / Buying Tips" pill. Story tiles are portrait video stills with a white play button.

**Corner radii** — Generous and consistent: buttons/inputs ~`16px`, cards ~`20px`, hero & large image
frames ~`28px`, pills fully round. Nothing is sharp-cornered.

**Cards**
- *Practice cards*: soft grey fill (`#EFEFEE`), ~20px radius, **no border**, status pills + gold asking
  price; "View Details →" in gold.
- *Article cards*: white fill with a **1px gold outline**, ~20px radius; gold date kicker, black title,
  grey excerpt, gold "Read Article →".
- *Journey / feature cards*: white, soft shadow, neutral round icon disc on top.
- *Story / testimonial cards*: white, rounded, soft shadow, large black quote, grey name, gold stars.
- General card rule: **rounded + soft shadow OR rounded + gold hairline** — never a coloured left-border
  accent strip.

**Buttons**
- *Primary*: solid gold, ink text, ~16px radius (e.g. "Buy", "Book Your Free Valuation").
- *Dark*: solid near-black, white text (e.g. "Sell").
- *Outline (light)*: white fill, **gold hairline**, ink text, trailing → ("View All Practices",
  "Explore", "Start Your Journey Today").
- *Outline (nav)*: white fill, **ink hairline**, ink text ("Book Valuation →").
- On the gold CTA banner, buttons are ink-outline on gold.

**Borders & dividers** — Hairlines only: `1px` gold outlines on cards/buttons, `1px #E7E7E4` neutral
dividers inside cards (e.g. above the price row).

**Shadows / elevation** — Soft, low, neutral (`rgba(15,15,10,.06–.12)`), never harsh. Floating elements
(hero search panel, feature cards) sit on a gentle `--shadow-md`. Gold buttons may carry a faint gold
glow on hover.

**Hover / press** — Restrained. Buttons darken slightly (gold → `--gold-hover`) and lift ~1px with a
softened shadow; outline buttons fill with a faint gold tint. Carousel arrows are solid gold circles.
Press = settle back down (translateY 0), no aggressive scale. Links gain underline / arrow nudges right.

**Transparency & blur** — Minimal. Used only as the hero's dark photo scrim and the floating white
search card. No glassmorphism elsewhere.

**Layout rules** — Centred `1200px` container, comfortable `80–96px` section padding, 3-up card grids
that collapse responsively. Carousels (articles, guides, stories, testimonials) use round gold prev/next
arrows pinned to the sides. Sticky top nav, dark footer with 4 link columns + gold social discs.

**Motion** — Quiet and confident: short fades + small rises (`opacity` + `translateY(8–12px)`),
`cubic-bezier(.16,1,.3,1)` ease-out, ~200–380ms. Carousels slide. No bounces, no parallax, no infinite
loops. Respect `prefers-reduced-motion`.

---

## ICONOGRAPHY

FTA uses **two complementary icon registers**, both supplied as crisp SVG (no icon font, no emoji, no
unicode glyphs-as-icons):

1. **Custom circular "feature disc" icons** (`assets/icons/icon1-4*`, value/member discs) — a solid
   **gold disc with a white line glyph** (or the inverse: white disc / gold glyph). These mark the
   primary value props (Value your practice = calculator, Become a member = bell, plus journey discs).
   Each glyph has matching `*-yellow-white` and `*-white-yellow` variants for use on light vs. coloured
   backgrounds.
2. **Feather / Lucide-style line icons** for the "Your journey" feature row (shield, people, handshake,
   refresh) and the contact cards (calendar, video, phone) — thin (~1.5px) gold strokes on a neutral
   round disc. Where an exact custom SVG isn't provided, **use [Lucide](https://lucide.dev) at ~1.5–2px
   stroke in gold** as the matched substitute (documented here).

**Status / inline icons** (`assets/icons/*-plain-icon.svg`) — tiny 12–16px glyphs that sit inside text:
`pin` (gold location), `leasehold` (black document), `available` (green tick-burst), `star` (gold
review star).

**Arrows** — A consistent arrow vocabulary: `right-yellow/black/white-plain-arrow` for inline link
trails (→), and `*-circle-arrow` (white glyph on gold disc) for carousel controls. A `down-yellow` arrow
for dropdown carets and an `up-white-yellow-square-arrow` for "back to top".

**Social** — Round disc icons for Instagram, Facebook, X, LinkedIn, YouTube, WhatsApp, each in two
finishes: `*-yellow-white-circle-icon` (gold disc, used in the footer) and `*-white-yellow-circle-icon`
(white disc, for light contexts). WhatsApp also appears as a standalone nav contact icon.

**Rules** — Keep icons monochrome (gold or ink/white), never multi-colour except the functional status
glyphs. Prefer the supplied SVGs; recolour via the two provided finishes rather than inventing new ones.
Never hand-draw replacement SVGs or use emoji.

---

## Font substitution (action needed)

The site's heading/body typeface is a neutral contemporary **grotesque** that we could not extract from
a screenshot. We've matched it to **Hanken Grotesk** (Google Fonts) and the serif wordmark to **Lora**.
These are close, tasteful stand-ins — **please send the real font files** (or confirm the family) so we
can swap them in for pixel-accurate type.
