import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import { getAllBlogPosts } from '@/lib/blog';
import { buildSitemap } from '@/lib/sitemap';
import { site } from '@/data';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../test/fixtures/blog',
);

describe('sitemap', () => {
  it('includes the About page entry unchanged', () => {
    const entries = sitemap();
    const aboutEntry = entries.find((entry) => entry.url === `${site.metadata.siteUrl}/about`);

    expect(aboutEntry).toEqual({
      url: `${site.metadata.siteUrl}/about`,
      lastModified: expect.any(Date),
      changeFrequency: 'monthly',
      priority: 0.9,
    });
  });

  it('includes the /blog listing entry', () => {
    const entries = buildSitemap(fixturesDir);
    const blogListing = entries.find((entry) => entry.url === `${site.metadata.siteUrl}/blog`);

    expect(blogListing).toEqual({
      url: `${site.metadata.siteUrl}/blog`,
      lastModified: expect.any(Date),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  });

  it('includes blog post URLs with lastModified dates from the reader module', () => {
    const posts = getAllBlogPosts(fixturesDir);
    const entries = buildSitemap(fixturesDir);

    for (const post of posts) {
      const entry = entries.find((item) => item.url === `${site.metadata.siteUrl}/blog/${post.slug}`);

      expect(entry).toEqual({
        url: `${site.metadata.siteUrl}/blog/${post.slug}`,
        lastModified: new Date(post.frontmatter.date),
        changeFrequency: 'yearly',
        priority: 0.6,
      });
    }
  });
});
