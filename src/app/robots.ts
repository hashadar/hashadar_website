import { MetadataRoute } from 'next'
import { site } from '@/data'

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

