import { describe, expect, it } from 'vitest';
import {
  fetchOwnerJobMarketPulseSource,
  ownerPulseSourceFromPayload,
} from './fetch-owner-job-market-pulse';

describe('ownerPulseSourceFromPayload', () => {
  it('parses owner corpusMeta with employer tiers from stored snapshot payload', () => {
    const source = ownerPulseSourceFromPayload({
      documentCount: 1,
      publishedAt: '2026-07-14T12:00:00.000Z',
      technologies: [{ name: 'python', count: 1 }],
      skills: [{ name: 'python', count: 1 }],
      seniority: [{ name: 'senior', count: 1 }],
      roleFamily: [{ name: 'data-science', count: 1 }],
      clusters: [{ id: 0, size: 1, label: 'Python stack' }],
      projection: [{ x: 0.1, y: 0.2, clusterId: 0 }],
      corpusMeta: {
        documents: [
          {
            id: 'jd-1',
            collectedAt: '2026-06-01T00:00:00.000Z',
            seniority: 'senior',
            roleFamily: 'data-science',
            employerSizeTier: 'enterprise',
            employerPrestigeTier: 'elite',
            technologies: ['python'],
            clusterId: 0,
            projectionX: 0.1,
            projectionY: 0.2,
          },
        ],
      },
    });

    expect(source?.corpusMeta.documents[0]).toMatchObject({
      employerSizeTier: 'enterprise',
      employerPrestigeTier: 'elite',
    });
  });

  it('returns null when corpusMeta is absent', () => {
    expect(
      ownerPulseSourceFromPayload({
        documentCount: 1,
        publishedAt: '2026-07-14T12:00:00.000Z',
        technologies: [],
        skills: [],
        seniority: [],
        roleFamily: [],
        clusters: [],
        projection: [],
      }),
    ).toBeNull();
  });
});

describe('fetchOwnerJobMarketPulseSource', () => {
  it('uses injected fetchOwnerPayload seam', async () => {
    const source = await fetchOwnerJobMarketPulseSource({
      fetchOwnerPayload: async () => ({
        snapshot: {
          documentCount: 1,
          publishedAt: '2026-07-14T12:00:00.000Z',
          skills: [],
          seniority: [],
          roleFamily: [],
          clusters: [],
          projection: [],
        },
        corpusMeta: {
          documents: [
            {
              id: 'jd-1',
              collectedAt: '2026-06-01T00:00:00.000Z',
              technologies: [],
              clusterId: 0,
            },
          ],
        },
      }),
    });

    expect(source?.corpusMeta.documents).toHaveLength(1);
  });
});
