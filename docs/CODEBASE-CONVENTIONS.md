# Codebase Conventions and Best Practice (AI Steering)

This document defines how to work in this codebase so that new and changed code stays consistent and follows established patterns. AI coding agents should follow these conventions when making changes.

---

## 1. Project overview

- **Framework:** Next.js 16 (App Router), React 19, TypeScript.
- **Styling:** Tailwind CSS v4, CSS variables for theming (light/dark), custom utilities in `tailwind.config.ts`.
- **Content:** Page and common content in `src/data` (JSON + TypeScript types); blog posts as Markdown in `public/blog` with sync from an external repo via `scripts/sync-blogs.js`.
- **Motion:** Framer Motion, with respect for `prefers-reduced-motion` everywhere.

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

### 4.3 Blog

- **Source of truth:** Markdown in `public/blog/*.md` (synced via `scripts/sync-blogs.js`). Directory reads and frontmatter assembly are in `src/lib/blog.ts`; **markdown string → HTML** for tests and reuse is in `src/lib/blog-markdown.ts` (`processMarkdown`).
- **Types:** Use `BlogPost` and `BlogPostFrontmatter` from `@/data/types`. Frontmatter keys: prefer a single canonical key per field; document if both kebab-case and camelCase are supported for legacy reasons.

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
- **Hooks:** Keep in `src/hooks/`. For `prefers-reduced-motion`, use `usePrefersReducedMotion()` from `@/hooks/use-prefers-reduced-motion` and gate all motion (Framer Motion) on it to avoid animating when the user prefers reduced motion.

---

## 6. Motion and accessibility

- **Framer Motion:** Use for scroll and viewport-based animations. Always branch on `usePrefersReducedMotion()`: when true, use zero duration or no transform (e.g. `opacity: 1`, `y: 0`) so no motion is applied.
- **Pattern:** `initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}`, `transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }}`, and similar. Do not animate when the user prefers reduced motion.
- **Focus:** Rely on the global focus-visible styles in `globals.css` for keyboard navigation; do not remove outline without an explicit, visible replacement.

---

## 7. Next.js and performance

### 7.1 Pages and layout

- **Metadata:** Export `metadata` or use `generateMetadata` for every route. Use `site` from `@/data` for base title, description, and URLs.
- **Layout:** Root layout provides font, theme script, and SEO (e.g. structured data). Each page that needs header/footer includes `<Header />` and `<FooterSection />` explicitly (no shared layout wrapper for them in the current structure).

### 7.2 Dynamic imports

- Use `next/dynamic` when a section is below the fold or heavy and not needed for first paint. Prefer a consistent strategy per route type (e.g. home vs content pages) so the codebase does not mix ad-hoc decisions. Document in this file or in code comments if the strategy is “dynamic for all below-fold sections on home only”.

### 7.3 Images

- Use the Next.js `Image` component with appropriate `sizes` and `priority` for above-the-fold images. Respect `next.config.ts` (e.g. `images.unoptimized` if set for the deployment target).

---

## 8. Scripts and tooling

- **Testing:** Vitest with Testing Library; colocate `*.test.ts` / `*.test.tsx` next to the module under test under `src/`. Global test setup: `src/test/setup.ts` (jest-dom matchers).
- **New scripts:** Prefer TypeScript and ESM. If a script must stay JavaScript, document why and keep it in `scripts/`. Use `process.cwd()` and `path.join` for paths; avoid hardcoded absolute paths.
- **ESLint:** Use the project’s ESLint config. Do not disable rules without a short comment explaining the exception.
- **British English:** Use British English in user-facing copy and in comments (e.g. “colour”, “behaviour”, “optimise”). Code and APIs follow existing naming (e.g. Tailwind’s `currentColor` stays as-is).

---

## 9. SEO and metadata

- **Structured data:** Prefer data from `src/data` and shared types. Avoid hardcoding person, organisation, or profile details in `structured-data.tsx`; move them to `site` or a dedicated JSON and type so they stay in sync with the rest of the site.
- **Sitemap:** When adding new public routes (including listing and detail pages like blog), add them to `src/app/sitemap.ts` with an appropriate `changeFrequency` and `priority`.
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

- **Architecture and technical debt:** Tracked as GitHub issues [#16](https://github.com/hashadar/hashadar_website/issues/16)–[#20](https://github.com/hashadar/hashadar_website/issues/20). When implementing those changes, align with this document and close or update the relevant issue.
- **Data structure and adding pages:** See `src/data/README.md`.
- **Agent workflow (issues, triage):** See `docs/agents/` and `AGENTS.md`.

---

*Keep this document updated when the team or project adopts new patterns or tools.*
