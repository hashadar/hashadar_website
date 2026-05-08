# Technical Debt and Findings Audit

This document catalogues technical debt, legacy code, and implementation that deviates from the intended norms in the codebase. It is for reference only; no fixes are prescribed here. Use it alongside `CODEBASE-CONVENTIONS.md` when planning changes.

---

## 1. Language and tooling consistency

### 1.1 Scripts in plain JavaScript (CommonJS)

- **Location:** `scripts/sync-blogs.js`
- **Finding:** The only script in the repo uses CommonJS (`require`/`module.exports`) and plain JavaScript. The rest of the project is TypeScript with ESM.
- **Impact:** No type safety, different module style, and the script is not covered by the same tooling (e.g. path aliases, tsconfig).

---

## 2. Data and content layer

### 2.2 JSON imports with type assertions

- **Location:** `src/data/index.ts`
- **Finding:** Page and common data are imported from JSON and cast with `as Type`. There is no runtime validation; invalid JSON or schema drift will only surface at usage.
- **Impact:** Risk of runtime errors if JSON is edited without updating types or vice versa.

### 2.5 Blog frontmatter key duality

- **Location:** `src/lib/blog.ts`
- **Finding:** Frontmatter supports both `ai-generated-content` (kebab-case) and `aiGeneratedContent` (camelCase) for the same field. Logic is duplicated in `getAllBlogPosts` and `getBlogPostBySlug`.
- **Impact:** Legacy compatibility pattern; increases maintenance and chance of inconsistency if more fields are added the same way.

---

## 3. Component and UI patterns

### 3.2 Footer section import source

- **Location:** `src/components/sections/footer-section.tsx`
- **Finding:** Imports from `@/components/ui/footer` (sub-path) instead of `@/components/ui`, unlike other sections that import from the main UI barrel.
- **Impact:** Inconsistent entry point for UI primitives; some components use the barrel, others use sub-paths.

### 3.3 Blog post page not using design system typography

- **Location:** `src/app/blog/[slug]/page.tsx`
- **Finding:** Article title and meta use raw `<h1>` and inline Tailwind classes (e.g. `text-4xl md:text-5xl`) instead of the shared `Heading` and `Text` components used elsewhere.
- **Impact:** Typography and spacing can drift from the rest of the site; design system is not applied consistently.

### 3.4 Button component polymorphism

- **Location:** `src/components/ui/button.tsx`
- **Finding:** The component handles both `<button>` and `<Link>` via an `href` prop and uses an `asChild` prop that renders a `<span>`. This is a custom implementation rather than a standard composition pattern (e.g. Radix-style `asChild` with a single child element).
- **Impact:** API is easy to misuse (e.g. passing both `href` and `asChild` or wrapping the wrong element); differs from common React patterns.

---

## 4. Next.js and app structure

### 4.1 Inconsistent use of dynamic imports

- **Finding:**
  - Home page: All below-the-fold sections (About, Photography, Experience, Blog, Footer) are loaded with `next/dynamic`.
  - About page: About hero is static; professional section, ExperienceListing, and Footer are dynamic.
  - Blog and Portfolio: FooterSection is imported statically.
- **Impact:** No clear rule for when to use dynamic import; performance strategy is inconsistent and may be over- or under-used.

---

## 5. Security and content safety

---

## 6. Client components and hooks

### 6.1 usePrefersReducedMotion and hydration

- **Location:** `src/hooks/use-prefers-reduced-motion.ts`
- **Finding:** Hook initialises state as `false` and updates in `useEffect` after reading `window.matchMedia`. During SSR and initial client render, the value is always `false` until the effect runs.
- **Impact:** Possible flash of animated content for users who have `prefers-reduced-motion: reduce`; accessibility and UX concern.

### 6.2 Redundant window check in client component

- **Location:** `src/components/sections/portfolio/portfolio-grid.tsx`
- **Finding:** `useEffect` and `onMouseEnter` use `typeof window !== 'undefined'` before using `window.Image` or `window`. The component is already `"use client"` and only runs in the browser.
- **Impact:** Defensive check is unnecessary in this context and adds noise.

---

## 7. Configuration and build

### 7.1 Next.js images

- **Location:** `next.config.ts` – `images: { unoptimized: true }`
- **Finding:** Image optimisation is disabled. This is sometimes used for static export or specific hosting constraints.
- **Impact:** If the app is deployed on a platform that supports Next image optimisation, this may be unnecessary and could be revisited.

### 7.2 Tailwind plugin typing

- **Location:** `tailwind.config.ts` – `plugins: [ function({ addUtilities }: any) { ... } ]`
- **Finding:** The plugin uses `any` for the parameter type.
- **Impact:** No type safety for Tailwind plugin API; minor but out of line with strict TypeScript elsewhere.

---

## 8. Styling and CSS

### 8.1 Duplicate line-clamp utilities

- **Location:** `src/app/globals.css`
- **Finding:** `.line-clamp-1`, `.line-clamp-2`, `.line-clamp-3` are defined with manual `-webkit-*` properties. Tailwind v4 (and v3) provide built-in `line-clamp-*` utilities.
- **Impact:** Redundant with Tailwind; could be replaced by Tailwind utilities for consistency and fewer custom lines.

### 8.2 Colour spelling

- **Location:** `src/app/globals.css` and comments (e.g. "Light mode colours")
- **Finding:** British English "colours" is used in comments; variable names use American "color" in Tailwind (e.g. `stroke="currentColor"`). No inconsistency in code, only in comment style.
- **Impact:** None functionally; aligns with project preference for British English in prose.

---

## 9. Metadata and SEO

### 9.1 Root layout keywords

- **Location:** `src/app/layout.tsx` – `metadata.keywords`
- **Finding:** Keywords are a hardcoded array. They are not derived from `site` or other data.
- **Impact:** Minor; if keywords are to be managed as content, they could live in the data layer.

---

## 10. Summary table

| Area              | Severity | Type           | Summary |
|-------------------|----------|----------------|---------|
| scripts/sync-blogs.js | Medium   | Legacy / consistency | CommonJS, no TypeScript |
| JSON validation   | Low      | Risk           | No runtime validation for JSON data |
| Blog frontmatter  | Low      | Duplication    | Dual keys and duplicated parsing logic |
| Footer import     | Low      | Consistency    | Footer section uses `ui/footer` not barrel |
| Blog [slug] typography | Low | Design system  | Raw h1/Tailwind instead of Heading/Text |
| Button API        | Low      | Pattern        | Custom polymorphic API |
| Dynamic imports   | Medium   | Consistency    | Inconsistent across pages |
| usePrefersReducedMotion | Medium | A11y/UX   | Possible hydration flash |
| Portfolio window check | Low   | Redundant      | Unnecessary in client component |
| images unoptimized | Low    | Config         | May be intentional |
| Tailwind plugin   | Low      | Typing         | `any` in plugin |
| line-clamp        | Low      | Redundancy     | Custom CSS vs Tailwind |

---

*Document generated from a one-time audit. Update this file when new debt is identified or when items are addressed.*

---

## Completed (2026-05-08)

### Font loading no longer depends on relative `node_modules` paths

- **What changed:** Removed `next/font/local` and the fragile `../../node_modules/...` font file paths from `src/app/layout.tsx`. Imported Zalando Sans Expanded weights via `@fontsource` in `src/app/globals.css`.
- **How it was completed:** Used package CSS imports and set the body font stack to prefer `"Zalando Sans Expanded"`. Verified via `npm run build`.

### Structured data is data-driven

- **What changed:** Moved person/profile fields into `src/data/common/site.json` under `person` (typed in `src/data/types.ts`). Updated `src/components/seo/structured-data.tsx` to use `site.person` and to derive `sameAs` from `footer.contact.social`.
- **How it was completed:** Eliminated hardcoded schema values in the component and verified via `npm run build`.

### Hardcoded copy moved into the data layer

- **What changed:** Centralised copy for:
  - Home About CTA (`home.about.cta`)
  - Home Blog CTA + empty state (`home.blog.cta`, `home.blog.emptyState`)
  - Blog page description (`blog.description`)
  - Header brand label (`site.brandName`)
  - Footer column titles (`footer.contact.navigationTitle`, `footer.contact.socialTitle`) and brand (`site.brandName`)
- **How it was completed:** Updated `src/data/pages/home.json`, `src/data/common/footer.json`, and wired components to consume these values.

### Blog markdown no longer allows raw HTML

- **What changed:** Removed `rehypeRaw` and `allowDangerousHtml` from `src/lib/blog.ts`.
- **How it was completed:** Markdown is now rendered via the standard remark/rehype pipeline (GFM, maths, slug, KaTeX) without raw HTML passthrough. Verified via `npm run build`.

### SVG allowance removed from Next image config

- **What changed:** Removed `images.dangerouslyAllowSVG` and the associated `contentSecurityPolicy` string from `next.config.ts`.
- **How it was completed:** Confirmed there are no `.svg` references under `src/` and verified via `npm run build`.

### Tailwind content path cleanup

- **What changed:** Removed the dead `./src/pages/**/*` entry from `tailwind.config.ts`.
- **How it was completed:** Kept `content` aligned to the App Router (`src/app`) and current component/style locations.

### `getPageData('/blog')` support

- **What changed:** Added `/blog` handling to `getPageData()` in `src/data/index.ts`.
- **How it was completed:** Returned the already-exported `blog` page data for the `/blog` route.

### Sitemap includes blog listing and posts

- **What changed:** Extended `src/app/sitemap.ts` to include `/blog` and each `/blog/[slug]` URL.
- **How it was completed:** Used `getAllBlogSlugs()` from `src/lib/blog.ts` to generate stable entries.

### UI import path consistency

- **What changed:** Removed remaining relative `../` UI imports in:
  - `src/components/ui/navigation/header.tsx`
  - `src/components/ui/section-header.tsx`
  - `src/components/ui/footer/footer-brand.tsx`
  - `src/components/ui/footer/footer-column.tsx`
- **How it was completed:** Switched to `@/`-aliased imports. For internal UI modules, used direct file imports to avoid circular dependencies via the UI barrel.

### Blog fallback image constant

- **What changed:** Centralised the blog fallback image path in `src/lib/blog-constants.ts` and used it in:
  - `src/components/ui/blog-card.tsx`
  - `src/app/blog/[slug]/page.tsx`
- **How it was completed:** Replaced the inline `'/img/mangrove_beach.webp'` check with `BLOG_FALLBACK_IMAGE`.
