# Content Data Structure

This directory contains all content data for the website, organised for scalability and maintainability.

## Directory Structure

```
src/data/
├── pages/           # Page-specific content (shell copy and layout labels)
│   ├── home.json
│   ├── about.json
│   ├── blog.json
│   └── portfolio.json
├── profile/         # Canonical career content (experience, education, certifications)
│   ├── career-profile.json
│   ├── experience-slices.ts
│   ├── education-slices.ts
│   ├── certifications-slices.ts
│   └── about-career-slices.ts
├── common/          # Shared content across pages
│   ├── footer.json
│   ├── navigation.json
│   └── site.json
├── types.ts         # TypeScript type definitions
├── validate.ts      # Runtime shape checks at the data boundary
├── index.ts         # Validated exports and helpers
└── README.md        # This file
```

## Public API

Prefer these entry points when wiring routes, layout, sitemap, and metadata:

```typescript
import {
  getPageData,
  getCommonData,
  careerProfile,
  getHomeExperienceView,
  getAboutCareerViews,
} from "@/data";

const home = getPageData("/");
const about = getPageData("/about");
const { footer, navigation, site } = getCommonData();
```

Named exports (`home`, `about`, `portfolio`, `blog`, `footer`, `navigation`, `site`, `careerProfile`) remain available and are the same validated objects returned by the helpers.

`SitePage` / `FooterSection` load common data via `getCommonData()` — routes should not prop-drill footer contact fields.

There is no `cv` export; career structured content lives in `careerProfile`.

## Career profile

Structured career content lives in `profile/career-profile.json`. Page-specific views are composed via slice helpers:

```typescript
import { careerProfile, getHomeExperienceView, getAboutCareerViews } from "@/data";

<ExperienceListing {...getHomeExperienceView(careerProfile)} />

const careerViews = getAboutCareerViews(careerProfile);
```

Page JSON under `pages/` holds shell content only. It does not duplicate career structured data.

## Validation

JSON files are validated when `@/data` is imported (and covered by `src/data/validate.test.ts`). Invalid shapes throw with the file path in the message so content edits fail fast in `npm test` / `npm run build`.

## Adding New Pages

1. Create `src/data/pages/<page>.json`
2. Add types in `src/data/types.ts`
3. Add an assert in `validate.ts` and call `validateDataFile` from `index.ts`
4. Export the named constant and extend `getPageData`
5. Add the route to `src/app/sitemap.ts` / `src/lib/sitemap.ts`
6. Wrap the page in `SitePage`

## Adding New Common Content

1. Create a JSON file in `src/data/common/`
2. Define its type in `src/data/types.ts`
3. Validate and export it in `index.ts`
4. Include it in `getCommonData()` when it is shared chrome (footer / nav / site)
