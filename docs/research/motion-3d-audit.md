# Selective 3D motion revamp — audit and locked direction

**Status:** Phase 0 complete (research + conventions). Implementation follows sibling sub-issues.  
**Parent epic:** [#229 — Epic: Selective 3D motion revamp](https://github.com/hashadar/hashadar_website/issues/229)  
**Conventions:** [CODEBASE-CONVENTIONS.md](../CODEBASE-CONVENTIONS.md) §1 overview and §6 Motion

This document is the durable source of truth for the selective-3D motion revamp: baseline inventory, market context, locked decisions, component matrix, performance rules, non-goals, and phase map.

---

## 1. Current baseline inventory

Audited against the codebase as of Phase 0 (issue #230).

### Dependencies

| Area | Today |
| --- | --- |
| Motion library | `framer-motion` (`package.json`) |
| 3D / WebGL | `three`, `@react-three/fiber`, `@react-three/drei` installed (Phase 1); Canvas not mounted until Phase 2 |

### Shared reveal — `MotionReveal`

**File:** `src/components/ui/motion-reveal.tsx`

- Variants: `fade-up` \| `fade` \| `slide-in` \| `none`
- Optional `delay`, `distance` (`sm` \| `md` \| `lg`), `inView` (default true)
- Fixed transition: `duration: 0.8`, `ease: "easeOut"` — no shared motion tokens
- Owns `usePrefersReducedMotion`; when reduced motion or `variant === "none"`, renders a plain `<div>` (no spatial animation)
- Used widely: section headers, prose, listings, blog/portfolio grids, footer brand/columns

### Home hero — springs and parallax

**File:** `src/components/sections/homepage/hero-section.tsx`

- Client section with Framer Motion springs for name/title enter
- Scroll parallax via `useScroll` + `useTransform` on name (`y` / `opacity`); zeroed when reduced motion
- Renders `HeroBackground` behind DOM typography (`Heading`)
- Angular accent divs (CSS diamonds/borders) sit in the DOM layer, not WebGL

### Floating diamond / square backgrounds

Same pattern: infinite `motion.div` loops (rotate / scale / translate) plus static geometric lines and `.geometric-pattern`. **None of these backgrounds call `usePrefersReducedMotion`.**

| Component | Path | Notes |
| --- | --- | --- |
| `HeroBackground` | `src/components/ui/backgrounds/hero-background.tsx` | Floating squares behind home hero |
| `SectionBackground` | `src/components/ui/backgrounds/section-background.tsx` | Variants `about-experience` \| `photography`; floating shapes |
| `FooterBackground` | `src/components/ui/footer/footer-background.tsx` | Floating shapes in site footer |

### Unused perspective utilities

**File:** `tailwind.config.ts`

- Custom utility `.perspective-1000` (`perspective: 1000px`) is defined
- **No consumers** in `src/` (true 3D CSS unused)

### Dead CSS

**File:** `src/app/globals.css`

| Selector | Status |
| --- | --- |
| `.hero-floating` (+ `@keyframes float`) | Defined; **unused** in components |
| `.hero-pulse` (+ `@keyframes pulse-glow`) | Defined; **unused** in components |

Hero motion today is Framer Motion in TSX, not these classes.

### Other motion touchpoints (keep quieter)

| Area | Today |
| --- | --- |
| Cards | CSS hover scale / overlay (`photo-card`, `blog-card`) |
| Lightbox | Framer Motion + `AnimatePresence` |
| Labs index / WMW charts | Local springs or chart motion; restrained |
| `use-smooth-scroll` | Hash-offset scrolling only — not Lenis |
| Admin / Login | No spectacle motion |

---

## 2. Market synthesis (2026)

Context for *why* selective 3D is the right ambition band for this site — not a mandate to copy agency stacks.

### Pragmatic baseline — CSS scroll-driven timelines

CSS `animation-timeline` / view timelines and scroll-driven animations are mature enough as a **pragmatic baseline** for reveals and section choreography without shipping a large JS animation runtime. They complement, rather than replace, a curated Framer Motion reveal primitive when the team already owns that API.

### Premium agency stack — out of scope

The common “premium agency” stack — **Lenis + GSAP + Three** site-wide — delivers buttery scroll and heavy scene work at the cost of bundle size, complexity, and maintenance. **Explicitly out of scope** for this epic. We keep Framer Motion for DOM motion and add WebGL only where it earns the job.

### WebGL only when it earns the job

WebGL is justified for a **signature surface** (here: the home hero depth field), not for wallpaper on every route. Decorative particle fields, NFT/metaverse aesthetics, and stock “floating geometry wallpaper” are noise — ignore them as creative references.

### Photography stays photography

Imagery on this site remains real photos. 3D does not replace the portfolio or home photography; it supplies depth and atmosphere behind DOM brand typography on `/` only.

---

## 3. Locked selective-3D decisions

| Decision | Choice |
| --- | --- |
| Ambition | **Selective 3D** — not basic fade-ups only, not a full-site WebGL / Lenis / GSAP build |
| WebGL surface | **Home hero only** — everywhere else stays DOM + Framer Motion / CSS |
| Stack | Keep `framer-motion`. Add `three`, `@react-three/fiber`, `@react-three/drei`. No GSAP, no Lenis, no site-wide Web Audio in this epic |
| Creative direction | Elevate the existing **angular brand language** into a real depth field — scroll- and idle-driven WebGL of planes / light cuts / geometric mass **behind** DOM typography (no mouse parallax). Photography grain/light influence welcome; no stock particle wallpaper, no mountain-terrain clone, no floating CSS diamonds |
| Typography | **Stays DOM** for SEO, selection, and a11y — WebGL is atmosphere and depth, not a wordmark mesh |
| Labs / Admin / Login | **Quieter** — no WebGL; only adopt shared motion tokens if a touch is trivial |
| PR target | Feature work → `develop` (see `docs/BRANCHING.md`) |

---

## 4. Target architecture (modules)

| Path | Purpose |
| --- | --- |
| `src/lib/motion/tokens.ts` | Durations, easings, springs, stagger steps — single source for Framer Motion + docs |
| `src/lib/motion/quality.ts` | WebGL quality tier (`high` / `medium` / `low` / `off`) from DPR, coarse pointer, reduced-motion (optional detect-gpu later) |
| `src/components/ui/hero-webgl/hero-webgl.tsx` | Client shell: Canvas, Suspense, pause when off-screen, fallback slot |
| `src/components/ui/hero-webgl/hero-scene.tsx` | R3F scene graph (geometry, materials, scroll/idle uniforms) |
| `src/components/ui/hero-webgl/hero-fallback.tsx` | Static / CSS atmosphere when WebGL off or reduced motion |
| `SectionBackground` internals (or `section-atmosphere.tsx`) | Replaces looping section background behaviour |

Optional: `MotionRevealGroup` for grid stagger.

---

## 5. Component change matrix

Actions: **add** / **upgrade** / **redesign** / **keep** / **retire**. Matches epic #229.

### New

| Path | Action |
| --- | --- |
| `src/lib/motion/tokens.ts` | Add |
| `src/lib/motion/quality.ts` | Add |
| `src/components/ui/hero-webgl/*` | Add |
| Optional `MotionRevealGroup` | Add (if grid stagger needs a shared primitive) |

### UI primitives

| File | Action |
| --- | --- |
| `motion-reveal.tsx` | **Upgrade** — tokens, variants, stagger, tests |
| `hero-background.tsx` | **Retire** (replace) — superseded by HeroWebGL + fallback |
| `section-background.tsx` | **Redesign** — no loops; quieter variants; a11y |
| `footer-background.tsx` | **Redesign** — no loops |
| `section-header.tsx` | Light touch — consume upgraded `MotionReveal` |
| `photo-card.tsx` / `blog-card.tsx` | **Polish** — coherent hover; reduced-motion (no scale zoom) |
| `lightbox.tsx` | **Keep** / light polish — tokens; reduced-motion instant |
| `social-link.tsx`, footer column/brand | **Keep** — inherit upgrades |
| `button.tsx`, `card.tsx`, `header.tsx` | **Keep** — mobile menu enter out of scope |
| `use-prefers-reduced-motion.ts` | **Keep** |
| `use-smooth-scroll.ts` | **Keep** — hash offsets only; no Lenis |

### Homepage (`src/app/page.tsx`)

| Section | File | Action |
| --- | --- | --- |
| Hero | `hero-section.tsx` | **Major rewrite** + WebGL |
| About prose | `prose-section.tsx` | New atmosphere; richer reveal |
| Photography | `photography-section.tsx` | Quiet atmosphere; PhotoCard polish |
| Blog teaser | `blog-section.tsx` | Stagger group; new bg |
| Experience | `experience-listing.tsx` | New bg; better stagger |

### About / Portfolio / Blog / Footer

| Surface | Action |
| --- | --- |
| About hero | Elevated DOM only — **no** WebGL; drop float bg |
| Shared listings + prose | New atmosphere + upgraded reveals |
| Portfolio / blog index | Stagger + card polish; optional static atmosphere |
| Blog post | **Keep quiet** |
| Footer | Redesigned `FooterBackground` |
| `site-page.tsx` | **Keep** |

### Labs (non-goals for spectacle)

| Surface | Action |
| --- | --- |
| Labs index | Keep restrained springs; optional tokens only |
| WMW / Job OS | Keep functional / CSS-only motion |

---

## 6. Performance budgets and load rules

### Load rules

- Dynamic-import hero WebGL from `hero-section.tsx` with `ssr: false` (or Next `dynamic` + client boundary) so home **LCP is not blocked by Three**.
- Cap `dpr` (e.g. `Math.min(devicePixelRatio, 1.5)` on medium; `1` on low).
- Pause `frameloop` when the hero leaves the viewport.
- Dispose geometries/materials on unmount.
- WebGL chunk only on the `/` hero path — **never** imported by about / portfolio / blog / labs.

### Budgets

| Metric | Target |
| --- | --- |
| Mid-range mobile | ≥30fps while hero visible |
| Desktop | ≥55fps while hero visible |
| Home LCP | Remains typography/brand (**DOM**), not canvas |
| Reduced motion / WebGL fail | `HeroFallback` looks intentional, not broken |

### Quality tiers

`src/lib/motion/quality.ts` maps device capability and preferences to `high` / `medium` / `low` / `off` (DPR, coarse pointer, `prefers-reduced-motion`; optional detect-gpu later).

---

## 7. Explicit non-goals

- WebGL on about, portfolio, blog, footer, or Labs
- Lenis / GSAP / site-wide page transitions / Web Audio
- Rewriting Job OS or WMW UX for spectacle
- Replacing photography with 3D — imagery remains real photos
- Installing or implementing Three/R3F in Phase 0 (docs only)
- NFT / metaverse / decorative particle wallpaper aesthetics as creative north stars

---

## 8. Phase map

Implementation order (six children under epic #229). Phases 4 and 5 are combined in #234.

| Phase | Issue | Title | Focus |
| --- | --- | --- | --- |
| 0 | [#230](https://github.com/hashadar/hashadar_website/issues/230) | Research doc + conventions | This document + conventions §1 / §6 |
| 1 | [#231](https://github.com/hashadar/hashadar_website/issues/231) | Foundation (deps + motion tokens) | Install R3F stack; `tokens.ts` / `quality.ts` |
| 2 | [#232](https://github.com/hashadar/hashadar_website/issues/232) | Signature home hero (WebGL) | HeroWebGL scene, fallback, dynamic import |
| 3 | [#233](https://github.com/hashadar/hashadar_website/issues/233) | MotionReveal + atmospheres + CSS cleanup | Upgrade reveals; redesign section/footer bg; remove dead CSS |
| 4–5 | [#234](https://github.com/hashadar/hashadar_website/issues/234) | Wire marketing + card polish | Marketing consumers; PhotoCard / BlogCard hover |
| 6 | [#235](https://github.com/hashadar/hashadar_website/issues/235) | QA, docs finish, Labs non-regression | Perf/a11y QA; docs polish; Labs stay calm |

### Epic acceptance (reminder)

When all phases complete: first viewport of `/` feels branded and dimensional; scroll + idle give hero presence; reduced-motion users get a strong static composition; public site shares one motion system; Labs remain calm; no WebGL on non-home routes; LCP/perf budgets met.

---

## Related

- Epic: [#229](https://github.com/hashadar/hashadar_website/issues/229)
- Conventions: [CODEBASE-CONVENTIONS.md](../CODEBASE-CONVENTIONS.md) §6
- Branching: [BRANCHING.md](../BRANCHING.md)
