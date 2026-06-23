import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import { site } from '@/data';

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
});
