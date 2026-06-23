import { describe, expect, it } from 'vitest';
import { metadata } from '@/app/about/page';
import { site } from '@/data';

describe('About page metadata', () => {
  it('remains unchanged after career data consolidation', () => {
    expect(metadata).toMatchObject({
      title: `About - ${site.metadata.author}`,
      description: 'Learn more about my background and experience.',
      openGraph: {
        title: `About - ${site.metadata.author}`,
        description: 'Learn more about my background and experience.',
        url: `${site.metadata.siteUrl}/about`,
        type: 'website',
      },
    });
  });
});
