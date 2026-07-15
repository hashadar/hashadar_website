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

  it('includes Labs index, job-market lab, and owner console routes', () => {
    const entries = sitemap();
    const labsEntry = entries.find((entry) => entry.url === `${site.metadata.siteUrl}/labs`);
    const jobMarketEntry = entries.find(
      (entry) => entry.url === `${site.metadata.siteUrl}/labs/job-market`,
    );
    const consoleEntry = entries.find(
      (entry) => entry.url === `${site.metadata.siteUrl}/labs/job-market/console`,
    );
    const corpusEntry = entries.find(
      (entry) =>
        entry.url === `${site.metadata.siteUrl}/labs/job-market/console/corpus`,
    );

    expect(labsEntry).toEqual({
      url: `${site.metadata.siteUrl}/labs`,
      lastModified: expect.any(Date),
      changeFrequency: 'monthly',
      priority: 0.8,
    });
    expect(jobMarketEntry).toEqual({
      url: `${site.metadata.siteUrl}/labs/job-market`,
      lastModified: expect.any(Date),
      changeFrequency: 'weekly',
      priority: 0.7,
    });
    expect(consoleEntry).toEqual({
      url: `${site.metadata.siteUrl}/labs/job-market/console`,
      lastModified: expect.any(Date),
      changeFrequency: 'monthly',
      priority: 0.2,
    });
    expect(corpusEntry).toEqual({
      url: `${site.metadata.siteUrl}/labs/job-market/console/corpus`,
      lastModified: expect.any(Date),
      changeFrequency: 'monthly',
      priority: 0.2,
    });
  });

  it('includes the owner login route', () => {
    const entries = sitemap();
    const loginEntry = entries.find((entry) => entry.url === `${site.metadata.siteUrl}/login`);

    expect(loginEntry).toEqual({
      url: `${site.metadata.siteUrl}/login`,
      lastModified: expect.any(Date),
      changeFrequency: 'yearly',
      priority: 0.3,
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
