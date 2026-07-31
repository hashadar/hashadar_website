import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import sitemap from '@/app/sitemap';
import { getAllBlogPosts } from '@/lib/blog';
import { buildSitemap } from '@/lib/sitemap';
import { site } from '@/data';

vi.mock('@/lib/site-content/server', async () => {
  const fixturesDir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../test/fixtures/blog',
  );
  const { getAllBlogPosts: getFixturePosts } = await import('@/lib/blog');
  return {
    getAllBlogPostsFromSiteContent: async () => getFixturePosts(fixturesDir),
  };
});

describe('sitemap', () => {
  it('includes the About page entry unchanged', async () => {
    const entries = await sitemap();
    const aboutEntry = entries.find((entry) => entry.url === `${site.metadata.siteUrl}/about`);

    expect(aboutEntry).toEqual({
      url: `${site.metadata.siteUrl}/about`,
      lastModified: expect.any(Date),
      changeFrequency: 'monthly',
      priority: 0.9,
    });
  });

  it('includes the /blog listing entry', async () => {
    const entries = await buildSitemap();
    const blogListing = entries.find((entry) => entry.url === `${site.metadata.siteUrl}/blog`);

    expect(blogListing).toEqual({
      url: `${site.metadata.siteUrl}/blog`,
      lastModified: expect.any(Date),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  });

  it('includes the Labs index and excludes the retired job-market lab routes', async () => {
    const entries = await sitemap();
    const labsEntry = entries.find((entry) => entry.url === `${site.metadata.siteUrl}/labs`);
    const jobMarketUrls = entries.filter((entry) =>
      entry.url.includes('/labs/job-market'),
    );

    expect(labsEntry).toEqual({
      url: `${site.metadata.siteUrl}/labs`,
      lastModified: expect.any(Date),
      changeFrequency: 'monthly',
      priority: 0.8,
    });
    expect(jobMarketUrls).toEqual([]);
  });

  it('omits Sign-in and Admin from the sitemap', async () => {
    const entries = await sitemap();
    expect(entries.find((entry) => entry.url === `${site.metadata.siteUrl}/login`)).toBeUndefined();
    expect(entries.find((entry) => entry.url === `${site.metadata.siteUrl}/admin`)).toBeUndefined();
  });

  it('includes blog post URLs with lastModified dates from Site Content readers', async () => {
    const fixturesDir = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../test/fixtures/blog',
    );
    const posts = getAllBlogPosts(fixturesDir);
    const entries = await buildSitemap();

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
