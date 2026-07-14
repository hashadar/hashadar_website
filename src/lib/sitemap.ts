import type { MetadataRoute } from 'next';
import { getCommonData } from '@/data';
import { getAllBlogPosts } from '@/lib/blog';

export function buildSitemap(blogDirectory?: string): MetadataRoute.Sitemap {
  const { site } = getCommonData();
  const baseUrl = site.metadata.siteUrl;
  const blogPosts = getAllBlogPosts(blogDirectory);
  const lastModified = new Date();
  const blogListingLastModified =
    blogPosts.length > 0 ? new Date(blogPosts[0].frontmatter.date) : lastModified;

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/portfolio`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: blogListingLastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...blogPosts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.frontmatter.date),
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
  ];
}
