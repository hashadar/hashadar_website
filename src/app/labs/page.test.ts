import { describe, expect, it } from 'vitest';
import { metadata } from '@/app/labs/page';
import { labs, site } from '@/data';

describe('Labs page metadata', () => {
  it('derives title and description from labs page data', () => {
    expect(metadata).toMatchObject({
      title: `${labs.heading} - ${site.metadata.author}`,
      description: labs.description,
      openGraph: {
        title: `${labs.heading} - ${site.metadata.author}`,
        description: labs.description,
        url: `${site.metadata.siteUrl}/labs`,
        type: 'website',
      },
    });
  });
});
