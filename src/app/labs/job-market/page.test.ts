import { describe, expect, it } from 'vitest';
import { metadata } from '@/app/labs/job-market/page';
import { jobMarketLab, site } from '@/data';

describe('Job market lab page metadata', () => {
  it('derives title and description from job market lab page data', () => {
    expect(metadata).toMatchObject({
      title: `${jobMarketLab.heading} - ${site.metadata.author}`,
      description: jobMarketLab.description,
      openGraph: {
        title: `${jobMarketLab.heading} - ${site.metadata.author}`,
        description: jobMarketLab.description,
        url: `${site.metadata.siteUrl}/labs/job-market`,
        type: 'website',
      },
    });
  });
});
