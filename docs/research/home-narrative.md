# Home narrative and marketing chrome

**Status:** Shipped. Epic: [#243](https://github.com/hashadar/hashadar_website/issues/243). Language: `docs/site/CONTEXT.md`. Loops: [ADR 0011](../adr/0011-home-loops-are-chrome.md). Home Photo: [ADR 0004](../adr/0004-home-photo-separate.md).

**References:** [Bellhop](https://www.bellhopco.com/) (cream, green, air, one hero Loop, work as stills) and [Love and Money](https://loveandmoney.com/) (full-viewport type, one idea per beat, work as large tiles). Hybrid: LAM composition, Bellhop surface.

**PR target:** `develop`.

## Locked spine

Home is Claim → Statement → Proof. Not a CV catalogue, not a six-step playbook.

| Beat | What | Media |
| --- | --- | --- |
| **Claim** | Two-line lockup `hasha` / `dar` (same size; longer line spans the viewport). Roles as questions, one pass, land on **all of the above.** | Loop behind (treated still). `h1` is the name. |
| **Statement** | hello. Short line, CTA **About** → `/about`. Portrait on the right. | Type and a black-and-white portrait. |
| **Proof** | Four large tiles, 2×2 desktop, stack mobile. Destination copy as the title. | Photograph on photographer; Loops on the rest. |

### Roles and doors

Sequence: `consultant?` → `photographer?` → `software developer?` → `writer?` → **all of the above.**

| Role | Media | Door |
| --- | --- | --- |
| consultant | Loop | `/about` |
| photographer | Home Photo | `/portfolio` |
| software developer | Loop | `/labs` (index only) |
| writer | Loop | `/blog` |

Mechanical engineer is not a Home Role. No `/work`. No deep link into a Lab. No lightbox on Home. Whole photographer tile is the door.

### Copy (Statement)

- Headline: **hello**
- Lines: **I'm Hasha, an AI & Data Consultant at Deloitte.** / **Find out more about me below.**
- CTA: **About**
- Continue: **See more** → Proof

### Motion

- Roles: one pass, then land. Do not loop the questions.
- Proof Loops: analog motion when in view. Hover may add a little extra on desktop; must not be required.
- `prefers-reduced-motion`: landed Claim (name + four Roles + landing line, no roll) and frozen stills (no grain crawl, no drift). No Ken Burns on the Home Photo.
- Screen readers: static text for the four Roles plus the landing line. Not a live region that announces every tick.

**Look:** Production `/` is the visual reference. Type is Zalando Sans Expanded.

### Claim lockup

- Two lines: `hasha` then `dar`. **One shared font size**, fitted so the longer line (`hasha`) spans the viewport width.
- Do **not** stretch `dar` independently to full width — that clips on landscape screens.
- Letters must not clip (no `overflow: hidden` eating glyphs). Roles sit on the bottom edge of the first viewport.
- Quiet header overlays the Claim; small wordmark; no frosted bar.

### Loops (assets)

Site chrome under `public/loops/` (landed, #250 closed):

- `claim-poster.webp`
- `consultant-poster.webp` (darker architectural plate; keep)
- `developer-poster.webp`
- `writer-poster.webp`

Unsplash abstracts. Motion is VFX on the still, in CSS/canvas, same family on all four:

- **Keep:** fine film grain (animated only when motion is allowed), sub-1% idle drift, slow light/vignette breathe.
- **Do not use:** pixelation, colour banding, glitch, RGB split as a look, generated video.

Photographer tile: photography poster still (`/loops/photography-poster.webp`), Loop-treated as a Photograph.

Until a still is missing: intentional CSS fallback.

### Off Home

Removed from `/` (shipped): About prose block, photography section, blog teaser, experience listing, Home lightbox.

About, Portfolio, Blog, and Labs index interiors inherit Home’s **surface** (type, cream/air, green, quiet Chrome), not Claim → Statement → Proof. That restyle is [#259](https://github.com/hashadar/hashadar_website/issues/259); lock: `docs/research/interior-pages.md`.

Login, Admin, Lab shells: not restyled as marketing.

## Chrome

Site-wide header and footer. No frosted bar, no border strip, no active underline pill.

**Header:** small wordmark → `/` (drop **Home** from the list). Doors: About, Portfolio, Labs, Blog. Theme toggle stays, quieter. On the Claim, overlay so it does not compete with the giant name — wordmark still present.

**Footer:** wordmark, same doors, email, GitHub, LinkedIn, copyright. **Admin** last and quiet. No slogan paragraph. No “Get in Touch” / “Navigation” / “Connect” headings. Sign-out stays in Admin and Lab shells.

## Type and colour

Keep Zalando Sans Expanded. No new serif this pass. Keep current green, light, and dark. Dark mode is the same chrome inverted.

## Code collisions

`src/data/types.ts` already has **`Role`** as a career job entry. Home Roles must not reuse that type name. Prefer `ClaimRole` (or similar) in data types; JSON field `roles` on the Claim is fine.

`getHomeExperienceView` leaves Home with the experience listing. Do not call it from `src/app/page.tsx` after this epic.

## Current baseline

Shipped. Production `/` is the visual reference.

| Area | Today |
| --- | --- |
| `/` | Claim → Statement → Proof |
| Header | Quiet overlay; wordmark + About, Portfolio, Labs, Blog; theme toggle |
| Footer | Wordmark, same doors, email, GitHub, LinkedIn, copyright, quiet Admin last |
| Home Photo | Photographer Proof piece only |
| Interiors | Separate epic [#259](https://github.com/hashadar/hashadar_website/issues/259) |
| Video | None |

## Target modules (indicative)

| Path | Action |
| --- | --- |
| `src/data/pages/home.json` + `types.ts` + `validate.ts` | Claim / Statement / Proof data; drop home about/blog/photography/experience |
| `src/data/common/navigation.json` | Header doors without Home or Admin; Admin as footer-only |
| `src/data/common/footer.json` | Drop slogan and column titles if unused |
| `src/components/ui/navigation/header.tsx` | Quiet overlay header |
| `src/components/sections/footer-section.tsx` + footer UI | Quiet close |
| `src/components/ui/loop/` (or similar) | Loop: treated still, in-view analog motion, reduced motion freeze |
| `src/components/sections/homepage/hero-section.tsx` | Rewrite as Claim |
| New Statement + Proof sections | Replace photography/blog/about/experience on Home |
| `src/app/page.tsx` | Wire Claim, Statement, Proof only |
| `docs/CODEBASE-CONVENTIONS.md` §1, §6, §7 | First-fold is Claim + Loop, not name/title over photo |

Keep `HeroMedia` if Proof can reuse it for the Home Photo; do not keep job-title hero behaviour.

## Explicit non-goals

- Restyling About / Portfolio / Blog / Labs index interiors (moved to [#259](https://github.com/hashadar/hashadar_website/issues/259))
- Playbook steps
- Admin video uploads
- R3F / Three on Home (a 2D canvas grain overlay is allowed)
- Generated video or a player on Proof
- Putting Labs products (Job OS, WMW) on the public Home

## Implementation order

See the epic sub-issues: #244 docs → #245 Chrome → #246 Loop + data → #247 Claim → #248 Statement/Proof → #249 QA. #250 is closed (stills in `public/loops/`).
