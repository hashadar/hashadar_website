# Codebase Conventions and Best Practice (AI Steering)

This document defines how to work in this codebase so that new and changed code stays consistent and follows established patterns. AI coding agents should follow these conventions when making changes.

---

## 1. Project overview

- **Framework:** Next.js 16 (App Router), React 19, TypeScript.
- **Styling:** Tailwind CSS v4, CSS variables for theming (light/dark), custom utilities in `tailwind.config.ts`.
- **Content:** Page and common content in `src/data` (JSON + TypeScript types). Blog Posts and portfolio Photos live in Amplify **Site Content** storage (manifests, markdown, WebPs), managed via `/admin`. A blog hero fallback WebP remains under `public/img/`.
- **Motion:** Framer Motion for site-wide DOM motion. Home first-fold atmosphere is **cinematic media** (Site Content home photo) behind DOM brand typography. `three` / R3F remain installed from the selective-3D epic but are **not imported or mounted** on any route. Respect `prefers-reduced-motion` everywhere. Direction and shipped inventory: `docs/research/motion-3d-audit.md`.

---

## 2. Naming and file organisation

### 2.1 Files and components

- **File names:** kebab-case: `section-header.tsx`, `blog-card.tsx`, `use-prefers-reduced-motion.ts`.
- **Components:** PascalCase, one main component per file. Export as named export: `export function SectionHeader(...)`.
- **Pages (App Router):** Use default export for the page component: `export default function AboutPage()`.

### 2.2 Directories

- `src/app/` – App Router routes and layout; keep page components thin and delegate to sections/components.
- `src/components/ui/` – Reusable UI primitives (buttons, cards, typography, layout). Use subfolders for groups (e.g. `typography/`, `footer/`, `layout/`).
- `src/components/sections/` – Page-specific section components, grouped by page: `homepage/`, `about/`, `blog/`, `portfolio/`, `shared/`, `footer-section.tsx`.
- `src/data/` – JSON content and TypeScript types; `pages/` for page data, `common/` for shared (footer, navigation, site).
- `src/lib/` – Pure logic and utilities (blog parsing, `cn()`).
- `src/hooks/` – React hooks (e.g. `use-prefers-reduced-motion`, `use-smooth-scroll`).
- `src/styles/` – Global and feature CSS (e.g. `blog-content.css`).

### 2.3 Barrel exports

- `src/components/ui/index.ts` is the single public barrel for UI. Prefer importing from `@/components/ui` rather than from `@/components/ui/button` or relative paths inside `ui/`.
- Subfolders (e.g. `footer/`, `backgrounds/`) may have their own `index.ts` for internal grouping; the main UI barrel re-exports what is public.

---

## 3. Imports and path aliases

- **Use the `@/` alias** for all imports under `src/`: `@/components/ui`, `@/data`, `@/lib/utils`, `@/hooks/...`, `@/data/types`.
- **Avoid relative imports** when crossing logical boundaries (e.g. from `sections` or `app` into `ui`). Use `@/components/ui` instead of `../../components/ui/...`.
- **Within a small subtree** (e.g. inside `components/ui/footer/`), relative imports are acceptable for siblings, but prefer `@/` for consistency where it stays readable.
- **Data:** Import from `@/data` (and types from `@/data` or `@/data/types`). Do not import JSON files directly from pages or components.

---

## 4. Data and content

### 4.1 Data-driven content

- **Copy and labels** that might change or be localised (buttons, headings, nav labels, brand name, footer column titles) should come from `src/data` (JSON + types), not be hardcoded in components.
- **Site-wide metadata** (title, description, author, siteUrl, brandName, locale) lives in `src/data/common/site.json` and is typed in `src/data/types.ts`. Use `site` from `@/data` in layout, metadata, and SEO.
- **Footer and navigation** come from `src/data`; use `footer`, `navigation`, and `site` in header, footer, and any shared layout.

### 4.2 Adding or changing content

- **New page content:** Add a JSON file under `src/data/pages/`, define the type in `src/data/types.ts`, export from `src/data/index.ts`, and extend `getPageData(route)` if the route should be resolvable by that helper.
- **New shared content:** Add JSON under `src/data/common/`, type in `types.ts`, export from `src/data/index.ts`.

### 4.3 Blog and portfolio (Site Content)

- **Source of truth:** Amplify Storage bucket `siteContent` — `blog/index.json` + `blog/posts/{slug}.md` (+ optional hero WebPs), `portfolio/manifest.json` + `portfolio/images/*`, and `home/photography.json` + `home/images/*` for the Home Photo. Readers live under `src/lib/site-content/` (server loaders in `server.ts`). Markdown → HTML remains in `src/lib/blog-markdown.ts` (`processMarkdown`). Raw markdown fixtures for Vitest live under `src/test/fixtures/blog/`.
- **WMW Snapshots:** Private Amplify Storage bucket `wmwSnapshots` (authenticated Site Admin only) holds last-good Snapshot JSON + as-of metadata. Keys and env wiring: `docs/wmw/snapshot-storage.md`; facade under `src/lib/wmw/`.
- **Admin:** Site Admin manages Posts and Photos at `/admin` (not under Labs). Sign-in is site-wide at `/login`.
- **Types:** Use `BlogPost` / `BlogPostFrontmatter` / `PhotoItem` from `@/data/types`. List metadata for Posts is authoritative in `blog/index.json`.
- **Sitemap:** `src/lib/sitemap.ts` (`buildSitemap`) derives blog URLs from Site Content readers. `/login` and `/admin` are omitted (noindex).

---

## 5. Components and UI

### 5.1 Design system

- **Typography:** Use `Heading` and `Text` from `@/components/ui` for all headings and body text. Do not use raw `<h1>`–`<h6>` or ad-hoc Tailwind typography classes for standard content.
- **Layout:** Use `Container` and `Section` for page structure and spacing. Use the `spacing` prop on `Section` for vertical rhythm.
- **Colours:** Use CSS variables: `var(--background)`, `var(--foreground)`, `var(--primary)`, `var(--muted)`, `var(--border)`. Do not introduce new hardcoded hex/rgb for theme colours.
- **Class names:** Use `cn()` from `@/lib/utils` whenever combining conditional or multiple Tailwind classes.

### 5.2 Props and composition

- **Props:** Prefer explicit interfaces for component props. Use `ReactNode` for `children` where appropriate.
- **Variants:** Use a small set of string literals (e.g. `variant?: "primary" | "ghost" | "outline"`) and map them to class objects; avoid large prop APIs.
- **Links:** Use Next.js `Link` for internal navigation. For button-styled links, use the existing `Button` with `href` or a consistent pattern documented in the component.

### 5.3 Client vs server

- **`"use client"`:** Add only when the component or a child uses hooks, browser APIs, or event handlers. Keep server components as the default for pages and static sections.
- **Hooks:** Keep in `src/hooks/`. Prefer `MotionReveal` for section reveals; use `usePrefersReducedMotion()` from `@/hooks/use-prefers-reduced-motion` only for bespoke motion (e.g. hero springs) that the primitive cannot express.

---

## 6. Motion and accessibility

- **Stack:** Framer Motion for DOM motion site-wide. Home first-fold is **cinematic media + DOM type** (full-bleed Site Content home photo, scrim, brand headings). `three` / R3F may remain as parked dependencies from earlier phases; they must **not** be imported on `/`, about, portfolio, blog, footer, or Labs. Full audit and phase map: `docs/research/motion-3d-audit.md`.
- **Tokens + `MotionReveal`:** Prefer shared motion tokens from `@/lib/motion/tokens` (`motionDurations`, `motionEasings`, `motionSprings`, `motionStagger`, `fadeUpDistance`) and `@/components/ui` `MotionReveal` for standard reveals. Pass `variant` (`fade-up` | `fade` | `slide-in` | `clip-up` | `none`), optional `delay`, `distance` (`sm` | `md` | `lg`), and `inView` (default true). Use `MotionRevealGroup` for grid stagger (token step, overridable). The primitive owns `usePrefersReducedMotion` and skips spatial animation when reduced motion is preferred. Prefer tokens over hard-coded durations/easings in new motion code. WebGL quality helpers in `@/lib/motion/quality` remain dormant for a possible future R3F surface.
- **Special cases:** Home hero may keep bespoke springs and scroll-driven media/type motion — do not recreate reduced-motion ternaries for ordinary fade/slide reveals; use `usePrefersReducedMotion()` only when the primitive cannot express the behaviour. No mouse parallax on the hero.
- **Home hero atmosphere:** Full-bleed photo from Site Content (`getHomePhotographyTeaser`) behind DOM brand typography. Missing photo → intentional CSS fallback. Prefer text paint for LCP (`HeroMedia` uses `priority={false}`); treat media as progressive atmosphere. Decorative media/fallback is `aria-hidden` with `pointer-events-none` so it cannot steal focus. On reduced motion, disable Ken Burns / media parallax and the scroll-cue bounce.
- **Decorative atmospheres:** `SectionBackground` variants are `marketing` (quiet grid/gradient rail), `photography` (minimal — imagery leads), and `none`. `FooterBackground` is static, non-looping accents only. Atmospheres must respect `prefers-reduced-motion` — no infinite decorative loops. Micro-interactions (card hover, lightbox) may stay outside `MotionReveal` but must still honour reduced motion (e.g. no scale zoom).
- **Labs / Admin / Login:** Quieter surfaces — no WebGL; no `SectionBackground` / `HeroMedia` / `MotionRevealGroup` spectacle. Adopt shared tokens only when a touch is trivial.

---

## 7. Next.js and performance

### 7.1 Pages and layout

- **Metadata:** Export `metadata` or use `generateMetadata` for every route. Use `site` from `@/data` for base title, description, and URLs. Prefer page JSON fields (e.g. `portfolio.heading` / `portfolio.description`) when they exist so SEO matches on-page copy.
- **Layout:** Root layout provides font, theme script, and SEO (e.g. structured data). Public routes wrap body content in `SitePage` (`@/components/layout/site-page`), which owns skip link, header, `main#main-content`, and the self-loaded footer. Pass `mainClassName` for route-specific spacing (e.g. `min-h-screen pt-20` on content pages). Authenticated layouts (e.g. future `/finance`) should be separate siblings, not copies of the public shell. See `docs/adr/0001-site-page-shell.md`.

### 7.2 Dynamic imports

- Use `next/dynamic` when a section is below the fold or heavy and not needed for first paint. **Footer:** always rendered statically via `SitePage` (no per-route lazy footer). **Home / About:** lazy-load below-the-fold sections only; keep hero eager.

### 7.3 Images

- Use the Next.js `Image` component with appropriate `sizes` and `priority` for above-the-fold images. Production uses Next image optimisation via `sharp` (see `next.config.ts`); reserve `priority` for true LCP candidates.

---

## 8. Scripts and tooling

- **Testing:** Vitest with Testing Library; colocate `*.test.ts` / `*.test.tsx` next to the module under test under `src/`. Global test setup: `src/test/setup.ts` (jest-dom matchers).
- **New scripts:** Prefer TypeScript and ESM. If a script must stay JavaScript, document why and keep it in `scripts/`. Use `process.cwd()` and `path.join` for paths; avoid hardcoded absolute paths.
- **ESLint:** Use the project’s ESLint config. Do not disable rules without a short comment explaining the exception.
- **British English:** Use British English in user-facing copy and in comments (e.g. “colour”, “behaviour”, “optimise”). Code and APIs follow existing naming (e.g. Tailwind’s `currentColor` stays as-is).

---

## 9. SEO and metadata

- **Structured data:** Prefer data from `src/data` and shared types. Avoid hardcoding person, organisation, or profile details in `structured-data.tsx`; move them to `site` or a dedicated JSON and type so they stay in sync with the rest of the site.
- **Sitemap:** When adding new public routes (including listing and detail pages like blog), add them to `src/lib/sitemap.ts` (via `buildSitemap`) with an appropriate `changeFrequency` and `priority`. Blog post entries use dates from the reader module.
- **Robots:** Keep `src/app/robots.ts` in sync with the intended indexing policy.

---

## 10. What to avoid

- **Hardcoded strings** for navigation labels, brand name, footer titles, or CTA text when equivalent content exists in `src/data`.
- **Relative imports** from `app` or `sections` into `components/ui`; use `@/components/ui`.
- **Raw typography** (plain `<h1>`/`<p>` with only Tailwind) in new or refactored pages; use `Heading` and `Text`.
- **New magic strings** (e.g. asset paths or feature flags) in the middle of components; use constants or config.
- **Animations** that run when `prefers-reduced-motion: reduce` is set.
- **Mixing default and named exports** for the same kind of module (e.g. all UI components are named exports; page components are default exports).
- **Introducing `any`** without a brief comment; prefer proper types or `unknown` with narrowing.

---

## 11. Reference

- **Deferred work and technical debt:** Tracked in [GitHub Issues](https://github.com/hashadar/hashadar_website/issues). Do not fix unless asked or the issue is in scope; when implementing, align with this document and close or update the relevant issue.
- **Data structure and adding pages:** See `src/data/README.md`.
- **Agent workflow (issues, triage):** See `docs/agents/` and `AGENTS.md`.

---

*Keep this document updated when the team or project adopts new patterns or tools.*
