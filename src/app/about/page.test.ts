import { describe, expect, it } from 'vitest';
import { metadata } from '@/app/about/page';
import { about, site } from '@/data';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aboutPageSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'page.tsx'),
  'utf8',
);

describe('About page metadata', () => {
  it('uses the biography lede for the description', () => {
    expect(metadata).toMatchObject({
      title: `About - ${site.metadata.author}`,
      description: about.lede[0],
      openGraph: {
        title: `About - ${site.metadata.author}`,
        description: about.lede[0],
        url: `${site.metadata.siteUrl}/about`,
        type: 'website',
      },
    });
  });

  it('does not mount a professional section or Labs CTA', () => {
    expect(aboutPageSource).not.toContain('ProseSection');
    expect(aboutPageSource).not.toContain('Explore Labs');
    expect(aboutPageSource).toContain('CareerRecord');
  });
});
