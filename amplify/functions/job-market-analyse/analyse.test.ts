import { describe, expect, it, vi } from 'vitest';
import {
  analyseCorpus,
  MAX_CLUSTER_K,
  MAX_PROJECTION_POINTS,
  MAX_SKILLS,
  type AnalyzableDocument,
} from './analyse';

const docs: AnalyzableDocument[] = [
  {
    id: 'jd-1',
    contentHash: 'hash-1',
    markdown:
      'We need Python, SQL, and teamwork. Senior data scientist role with modelling.',
    seniority: 'senior',
    roleFamily: 'data-science',
  },
  {
    id: 'jd-2',
    contentHash: 'hash-2',
    markdown: 'Looking for Python, Tableau, and communication skills.',
    seniority: 'mid',
    roleFamily: 'analytics',
  },
  {
    id: 'jd-3',
    contentHash: 'hash-1',
    markdown:
      'We need Python, SQL, and teamwork. Senior data scientist role with modelling.',
    seniority: 'senior',
    roleFamily: 'data-science',
  },
];

describe('analyseCorpus', () => {
  it('publishes a snapshot within caps and accounts for embedding cache hits', async () => {
    const embed = vi.fn(async (text: string) => ({
      vector: Array.from({ length: 8 }, (_, index) => (text.length + index) / 100),
      inputTokens: 12,
      estimatedCostUsd: 0.0001,
    }));
    const cacheGet = vi.fn(async (contentHash: string) =>
      contentHash === 'hash-1'
        ? Array.from({ length: 8 }, (_, index) => index / 10)
        : null,
    );
    const cachePut = vi.fn(async () => undefined);

    const result = await analyseCorpus(docs, {
      embed,
      getCachedEmbedding: cacheGet,
      putCachedEmbedding: cachePut,
      now: new Date('2026-07-14T12:00:00.000Z'),
    });

    expect(result.snapshot.skills.length).toBeLessThanOrEqual(MAX_SKILLS);
    expect(result.snapshot.projection.length).toBeLessThanOrEqual(
      MAX_PROJECTION_POINTS,
    );
    expect(result.snapshot.clusters.length).toBeLessThanOrEqual(MAX_CLUSTER_K);
    expect(result.snapshot.documentCount).toBe(3);
    expect(result.snapshot.publishedAt).toBe('2026-07-14T12:00:00.000Z');
    expect(result.snapshot).not.toHaveProperty('rawText');
    expect(result.snapshot).not.toHaveProperty('source');
    expect(result.snapshot.skills.every((skill) => typeof skill.name === 'string')).toBe(
      true,
    );
    expect(result.metrics).toMatchObject({
      docsConsidered: 3,
      docsCacheHit: 2,
      docsEmbedded: 1,
    });
    expect(result.metrics.bedrockInputTokens).toBeGreaterThan(0);
    expect(result.metrics.estimatedCostUsd).toBeGreaterThan(0);
    expect(embed).toHaveBeenCalledOnce();
    expect(cachePut).toHaveBeenCalledOnce();
  });
});
