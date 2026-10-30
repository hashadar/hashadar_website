import { MetadataRoute } from 'next'
import { site } from '@/data'

// Court Board (/labs/court-board) is deliberately not disallowed: it is noindex via
// metadata and an X-Robots-Tag header (next.config.ts), which crawlers can only
// obey if they are allowed to fetch the page. It is also absent from the sitemap.
export default function robots(): MetadataRoute.Robots {
  const baseUrl = site.metadata.siteUrl

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/', '/private/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

