import { describe, expect, it } from 'vitest';
import { metadata } from '@/app/labs/wmw/page';
import { getPageData, site } from '@/data';

const page = getPageData('/labs/wmw');

describe('WMW Overview page metadata', () => {
  it('marks the private lab as noindex (Job OS pattern)', () => {
    expect(metadata).toMatchObject({
      title: `${page.heading} - ${site.metadata.author}`,
      description: page.description,
      robots: {
        index: false,
        follow: false,
      },
    });
  });
});
