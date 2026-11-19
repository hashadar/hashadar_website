import { describe, expect, it } from 'vitest';
import { metadata as overviewMetadata } from '@/app/labs/cfa/page';
import { metadata as captureMetadata } from '@/app/labs/cfa/capture/page';
import { metadata as importMetadata } from '@/app/labs/cfa/import/page';
import { metadata as questionsMetadata } from '@/app/labs/cfa/questions/page';
import { cfa, site } from '@/data';

describe('CFA Lab page metadata', () => {
  it('marks every private CFA page as noindex (WMW / Job OS pattern)', () => {
    for (const metadata of [overviewMetadata, captureMetadata, importMetadata, questionsMetadata]) {
      expect(metadata).toMatchObject({
        description: cfa.description,
        robots: { index: false, follow: false },
      });
    }
    expect(overviewMetadata.title).toBe(`${cfa.heading} - ${site.metadata.author}`);
  });
});
