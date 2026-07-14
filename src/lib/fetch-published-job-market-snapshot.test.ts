import { describe, expect, it } from 'vitest';
import {
  fetchPublishedSnapshotViaQuery,
  publishedQueryFromClient,
} from './fetch-published-job-market-snapshot';
import { getPublishedJobMarketSnapshot } from './job-market-lab';

describe('fetchPublishedSnapshotViaQuery', () => {
  it('yields empty publication when the query returns null data', async () => {
    const result = await getPublishedJobMarketSnapshot({
      fetchPublished: () =>
        fetchPublishedSnapshotViaQuery({
          getPublishedJobMarketSnapshot: async () => ({ data: null }),
        }),
    });

    expect(result).toEqual({ status: 'empty' });
  });

  it('yields empty publication when the query returns errors', async () => {
    const result = await getPublishedJobMarketSnapshot({
      fetchPublished: () =>
        fetchPublishedSnapshotViaQuery({
          getPublishedJobMarketSnapshot: async () => ({
            data: { documentCount: 1 },
            errors: [{ message: 'Unauthorised' }],
          }),
        }),
    });

    expect(result).toEqual({ status: 'empty' });
  });

  it('yields published and sanitised snapshot when the query returns a payload', async () => {
    const result = await getPublishedJobMarketSnapshot({
      fetchPublished: () =>
        fetchPublishedSnapshotViaQuery({
          getPublishedJobMarketSnapshot: async () => ({
            data: {
              documentCount: 2,
              publishedAt: '2026-07-14T12:00:00.000Z',
              skills: [{ name: 'python', count: 2 }],
              seniority: [{ name: 'senior', count: 1 }],
              roleFamily: [{ name: 'engineering', count: 2 }],
              clusters: [{ id: 0, size: 2, label: 'Theme A' }],
              projection: [{ x: 0.1, y: 0.2, clusterId: 0 }],
              employer: 'must-not-leak',
            },
          }),
        }),
    });

    expect(result).toEqual({
      status: 'published',
      snapshot: {
        documentCount: 2,
        publishedAt: '2026-07-14T12:00:00.000Z',
        skills: [{ name: 'python', count: 2 }],
        seniority: [{ name: 'senior', count: 1 }],
        roleFamily: [{ name: 'engineering', count: 2 }],
        clusters: [{ id: 0, size: 2, label: 'Theme A' }],
        projection: [{ x: 0.1, y: 0.2, clusterId: 0 }],
      },
    });
  });

  it('only invokes the published query — never lists historical snapshots', async () => {
    const client = {
      queries: {
        getPublishedJobMarketSnapshot: async () => ({
          data: {
            documentCount: 1,
            publishedAt: '2026-07-14T12:00:00.000Z',
            skills: [],
            seniority: [],
            roleFamily: [],
            clusters: [],
            projection: [],
          },
        }),
      },
      models: {
        CorpusSnapshot: {
          list: async () => {
            throw new Error('guests must not list CorpusSnapshot');
          },
        },
        LabPublication: {
          list: async () => {
            throw new Error('guests must not list LabPublication');
          },
        },
      },
    };

    const result = await getPublishedJobMarketSnapshot({
      fetchPublished: () =>
        fetchPublishedSnapshotViaQuery(publishedQueryFromClient(client)),
    });

    expect(result.status).toBe('published');
  });
});
