import { describe, expect, it } from 'vitest';
import { getPublishedJobMarketSnapshot } from './job-market-lab';

describe('getPublishedJobMarketSnapshot', () => {
  it('returns empty when nothing is published', async () => {
    const result = await getPublishedJobMarketSnapshot({
      fetchPublished: async () => null,
    });

    expect(result).toEqual({ status: 'empty' });
  });

  it('returns published when a snapshot is available', async () => {
    const snapshot = {
      documentCount: 3,
      publishedAt: '2026-07-01T00:00:00.000Z',
    };

    const result = await getPublishedJobMarketSnapshot({
      fetchPublished: async () => snapshot,
    });

    expect(result).toEqual({ status: 'published', snapshot });
  });

  it('does not expose raw job description or employer identity fields', async () => {
    const result = await getPublishedJobMarketSnapshot({
      fetchPublished: async () =>
        ({
          documentCount: 1,
          publishedAt: '2026-07-01T00:00:00.000Z',
          rawText: 'Acme Corp seeks a data scientist…',
          source: 'confidential-board',
          employer: 'Acme Corp',
        }) as never,
    });

    expect(result).toEqual({
      status: 'published',
      snapshot: {
        documentCount: 1,
        publishedAt: '2026-07-01T00:00:00.000Z',
      },
    });
  });
});
