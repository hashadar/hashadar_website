import { describe, expect, it } from 'vitest';
import {
  getPublishedJobMarketSnapshot,
  startJobMarketRecompute,
} from './job-market-lab';

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
      technologies: [{ name: 'python', count: 3 }],
      skills: [{ name: 'python', count: 3 }],
      seniority: [{ name: 'senior', count: 2 }],
      roleFamily: [{ name: 'data-science', count: 2 }],
      clusters: [{ id: 0, size: 3, label: 'Theme 1' }],
      projection: [{ x: 0.1, y: 0.2, clusterId: 0 }],
    };

    const result = await getPublishedJobMarketSnapshot({
      fetchPublished: async () => snapshot,
    });

    expect(result).toEqual({ status: 'published', snapshot });
  });

  it('maps legacy skills-only snapshots onto the technologies pulse', async () => {
    const result = await getPublishedJobMarketSnapshot({
      fetchPublished: async () => ({
        documentCount: 2,
        publishedAt: '2026-07-01T00:00:00.000Z',
        skills: [{ name: 'sql', count: 2 }],
        seniority: [],
        roleFamily: [],
        clusters: [],
        projection: [],
      }),
    });

    expect(result).toEqual({
      status: 'published',
      snapshot: {
        documentCount: 2,
        publishedAt: '2026-07-01T00:00:00.000Z',
        technologies: [{ name: 'sql', count: 2 }],
        skills: [{ name: 'sql', count: 2 }],
        seniority: [],
        roleFamily: [],
        clusters: [],
        projection: [],
      },
    });
  });

  it('does not expose raw job description or employer identity fields', async () => {
    const result = await getPublishedJobMarketSnapshot({
      fetchPublished: async () =>
        ({
          documentCount: 1,
          publishedAt: '2026-07-01T00:00:00.000Z',
          skills: [],
          seniority: [],
          roleFamily: [],
          clusters: [],
          projection: [],
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
        technologies: [],
        skills: [],
        seniority: [],
        roleFamily: [],
        clusters: [],
        projection: [],
      },
    });
  });

  it('returns empty from the default Amplify path when outputs are absent', async () => {
    const result = await getPublishedJobMarketSnapshot();

    expect(result).toEqual({ status: 'empty' });
  });
});

describe('startJobMarketRecompute', () => {
  it('returns started with runId when the injected start succeeds', async () => {
    const result = await startJobMarketRecompute({
      startRecompute: async () => ({
        status: 'started',
        runId: 'run-123',
      }),
    });

    expect(result).toEqual({
      status: 'started',
      runId: 'run-123',
    });
  });

  it('returns rejected with reason when a run is already in progress', async () => {
    const result = await startJobMarketRecompute({
      startRecompute: async () => ({
        status: 'rejected',
        reason: 'An analysis run is already in progress',
      }),
    });

    expect(result).toEqual({
      status: 'rejected',
      reason: 'An analysis run is already in progress',
    });
  });

  it('rejects clearly from the default Amplify path when outputs are absent', async () => {
    const result = await startJobMarketRecompute();

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Recompute client is not configured',
    });
  });
});
