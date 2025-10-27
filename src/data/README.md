# Content Data Structure

This directory contains all content data for the website, organized for scalability and maintainability.

## Directory Structure

```
src/data/
├── pages/           # Page-specific content
│   └── home.json    # Homepage content (hero, about, photography, experience)
├── common/          # Shared content across pages
│   ├── footer.json      # Footer contact info and social links
│   ├── navigation.json  # Navigation menu items
│   └── site.json        # Site metadata and branding
├── types.ts         # TypeScript type definitions
├── index.ts         # Data exports and helper functions
└── README.md        # This file
```

## Usage

### Import data in your components:

```typescript
// Import specific data
import { home, footer, navigation, site } from "@/data";

// Use in a component
<HeroSection {...home.hero} />
<FooterSection {...footer.contact} />
```

### Using helper functions:

```typescript
import { getPageData, getCommonData } from "@/data";

// Get page data by route
const pageData = getPageData('/');

// Get all common data at once
const { footer, navigation, site } = getCommonData();
```

## Adding New Pages

1. **Create a new page data file** in `src/data/pages/`:
   ```json
   // src/data/pages/blog.json
   {
     "title": "My Blog",
     "posts": [...]
   }
   ```

2. **Define types** in `src/data/types.ts`:
   ```typescript
   export interface BlogPageData {
     title: string;
     posts: Post[];
   }
   ```

3. **Export in** `src/data/index.ts`:
   ```typescript
   import blogData from './pages/blog.json';
   export const blog = blogData as BlogPageData;
   ```

4. **Update the helper** in `src/data/index.ts`:
   ```typescript
   export function getPageData(route: string) {
     switch (route) {
       case '/': return home;
       case '/blog': return blog;
       default: return null;
     }
   }
   ```

## Adding New Common Content

For content shared across multiple pages (like headers, footers, etc.):

1. Create a JSON file in `src/data/common/`
2. Define its TypeScript type in `src/data/types.ts`
3. Import and export it in `src/data/index.ts`

## Future Enhancements

### Multi-language Support

When ready for internationalization, restructure as:

```
src/data/
├── locales/
│   ├── en/
│   │   ├── pages/
│   │   └── common/
│   └── fr/
│       ├── pages/
│       └── common/
└── ...
```

### Content Management System (CMS)

The current structure is compatible with:
- Contentful
- Sanity
- Strapi
- Any headless CMS

Simply replace JSON imports with API calls in `src/data/index.ts`.

## Benefits of This Structure

- **Separation of Concerns**: Page content vs. shared content
- **Type Safety**: Full TypeScript support
- **Scalability**: Easy to add new pages
- **Maintainability**: Clear organization
- **DRY**: Shared content defined once
- **Future-proof**: Ready for i18n and CMS integration

