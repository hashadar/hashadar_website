import { describe, expect, it } from 'vitest';
import { sanitiseSnapshotPayloadForGuests } from './sanitize';

describe('sanitiseSnapshotPayloadForGuests', () => {
  it('strips employer tiers and taxonomy fields from corpusMeta', () => {
    const result = sanitiseSnapshotPayloadForGuests({
      documentCount: 1,
      publishedAt: '2026-07-14T12:00:00.000Z',
      technologies: [{ name: 'python', count: 1 }],
      skills: [{ name: 'python', count: 1 }],
      seniority: [],
      roleFamily: [],
      clusters: [],
      projection: [],
      corpusMeta: {
        documents: [
          {
            id: 'jd-1',
            collectedAt: '2026-06-01T00:00:00.000Z',
            seniority: 'senior',
            roleFamily: 'data_science',
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

    expect(result.corpusMeta).toEqual({
      documents: [
        {
          id: 'jd-1',
          collectedAt: '2026-06-01T00:00:00.000Z',
          technologies: ['python'],
          clusterId: 0,
          projectionX: 0.1,
          projectionY: 0.2,
        },
      ],
    });
  });
});
