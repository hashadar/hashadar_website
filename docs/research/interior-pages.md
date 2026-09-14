# Interior pages

**Status:** In progress. Epic: [#259](https://github.com/hashadar/hashadar_website/issues/259). Language: `docs/site/CONTEXT.md`. Home lock: `docs/research/home-narrative.md`.

**PR target:** `develop`.

Public interiors inherit Home’s **surface**, not its spine. Large left-aligned type, cream or plain air, the same green. One idea per fold. Quiet `MotionReveal`. They are not a second Claim → Statement → Proof.

Visual reference: production `/`. Chrome (header/footer) is already the quiet overlay — do not redo it.

## Locked decisions

- **Surface, not spine.** No two-line `hasha` / `dar` lockup, Role questions, or 2×2 Proof grid on other pages.
- **About stays biography.** Quiet page title, short lede, optional portrait. Career facts follow as one record (experience, education, certifications). Restyle; do not rewrite as a second Statement. Home already made the argument (one practice, not a menu). Copy may be tightened; do not drop career facts, invent a new narrative spine, or put a Labs door on About.
- **Labs index stays a catalogue**, not a Lab and not Proof tiles. Proof already doors into `/labs`.
- **Photographs untreated.** No Loop treatment on interiors in v1.
- **Login / Admin stay utility.** Quiet `SitePage` surfaces; light copy and accent cleanup only.
- **Do not change Job OS chrome.** `SectionHeader` still defaults `showLeftAccent`. Marketing pages must not request geometric accents.

## First fold

Shared `PageIntro`: large left-aligned `Heading` + short lede. Cream or plain air. No `SectionBackground` marketing grid. No `SectionHeader` skew rails, diamonds, or clip-path frames.

About is the exception: the first fold is the biography (quiet title + tightened lede + Statement portrait), not the name and not a second Claim. Portfolio, Blog, and Labs use `PageIntro` without cloning Statement’s CTA or continue link.

## What to drop

Geometric ornaments: skew rails, diamond accents, clip-path frames, `geometric-pattern` atmospheres, default `SectionHeader` left bar on public interiors.

Hover zoom on cards is optional and must honour `prefers-reduced-motion`.

## Surfaces

| Route | Role |
| --- | --- |
| `/about` | Biography |
| `/portfolio` | Photography stills + lightbox |
| `/blog` | Writer catalogue |
| `/blog/[slug]` | Article |
| `/labs` | Catalogue of Labs |
| `/login`, `/admin` | Utility (not marketing) |

**Out:** Job OS, WMW, Lab shells, a contact page, new Site Content types, R3F / video.

## Implementation order

#260 docs + shared first-fold → #261 About → #262 Portfolio → #263 Blog → #264 Labs catalogue → #265 Login/Admin → #266 QA.
