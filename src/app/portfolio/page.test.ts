import { describe, expect, it } from 'vitest';
import { metadata } from '@/app/portfolio/page';
import { portfolio, site } from '@/data';

describe('Portfolio page metadata', () => {
  it('derives title and description from portfolio page data', () => {
    expect(metadata).toMatchObject({
      title: `${portfolio.heading} - ${site.metadata.author}`,
      description: portfolio.description,
      openGraph: {
        title: `${portfolio.heading} - ${site.metadata.author}`,
        description: portfolio.description,
        url: `${site.metadata.siteUrl}/portfolio`,
        type: 'website',
      },
    });
  });
});
