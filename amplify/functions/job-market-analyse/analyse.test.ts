import { describe, expect, it, vi } from 'vitest';
import {
  analyseCorpus,
  buildClusterLabel,
  deriveClusterKey,
  MAX_CLUSTER_K,
  MAX_PROJECTION_POINTS,
  MAX_SKILLS,
  resolveClusterLabel,
  type AnalyzableDocument,
} from './analyse';
import { matchTechnologiesInDocuments } from './technology-ontology';

const docs: AnalyzableDocument[] = [
  {
    id: 'jd-1',
    contentHash: 'hash-1',
    collectedAt: '2026-06-01T00:00:00.000Z',
    markdown:
      'We need Python, SQL, and teamwork. Senior data scientist role with modelling.',
    seniority: 'senior',
    roleFamily: 'data-science',
  },
  {
    id: 'jd-2',
    contentHash: 'hash-2',
    collectedAt: '2026-05-01T00:00:00.000Z',
    markdown: 'Looking for Python, Tableau, and communication skills.',
    seniority: 'mid',
    roleFamily: 'analytics',
  },
  {
    id: 'jd-3',
    contentHash: 'hash-1',
    collectedAt: '2026-04-01T00:00:00.000Z',
    markdown:
      'We need Python, SQL, and teamwork. Senior data scientist role with modelling.',
    seniority: 'senior',
    roleFamily: 'data-science',
  },
];

describe('buildClusterLabel', () => {
  it('joins the top two matched technologies in cluster documents', () => {
    const documents = [
      { markdown: 'Python, SQL, and dbt experience required.' },
      { markdown: 'Strong Python and SQL background.' },
    ];

    expect(buildClusterLabel(0, documents)).toBe('python, sql');
  });

  it('falls back to a requirement theme label when no technologies match', () => {
    expect(buildClusterLabel(2, [{ markdown: 'Excellent communication and teamwork.' }])).toBe(
      'Requirement theme 3',
    );
  });
});

describe('deriveClusterKey', () => {
  it('builds a stable key from the top matched technologies', () => {
    const documents = [{ markdown: 'Python, SQL, and teamwork.' }];

    expect(deriveClusterKey(documents)).toBe('python|sql');
  });

  it('returns an empty key when no technologies match', () => {
    expect(deriveClusterKey([{ markdown: 'Communication and stakeholder management.' }])).toBe('');
  });
});

describe('resolveClusterLabel', () => {
  it('prefers an owner override keyed by cluster id', () => {
    const documents = [{ markdown: 'Python and SQL required.' }];

    expect(
      resolveClusterLabel(1, documents, {
        '1': 'Data platform hiring signal',
      }),
    ).toBe('Data platform hiring signal');
  });

  it('falls back to the deterministic technology label', () => {
    const documents = [{ markdown: 'Python and SQL required.' }];

    expect(resolveClusterLabel(0, documents, {})).toBe('python, sql');
  });
});

describe('matchTechnologiesInDocuments', () => {
  it('matches canonical technology names and aliases once per document', () => {
    const documents = [
      { markdown: 'We need Python, SQL, and teamwork.' },
      { markdown: 'Looking for py, Snowflake, and k8s experience.' },
      { markdown: 'We need Python, SQL, and teamwork.' },
    ];

    expect(matchTechnologiesInDocuments(documents)).toEqual([
      { name: 'python', count: 2 },
      { name: 'sql', count: 2 },
      { name: 'kubernetes', count: 1 },
      { name: 'snowflake', count: 1 },
    ]);
  });
});

describe('analyseCorpus cluster labels', () => {
  it('publishes deterministic technology labels instead of Theme N placeholders', async () => {
    const clusterDocs: AnalyzableDocument[] = [
      {
        id: 'jd-a',
        contentHash: 'hash-a',
        collectedAt: '2026-06-01T00:00:00.000Z',
        markdown: 'Python, SQL, and modelling experience.',
      },
      {
        id: 'jd-b',
        contentHash: 'hash-b',
        collectedAt: '2026-05-01T00:00:00.000Z',
        markdown: 'Tableau, communication, and stakeholder management.',
      },
    ];

    const result = await analyseCorpus(clusterDocs, {
      embed: async () => ({
        vector: [0.9, 0.1, 0.2, 0.3],
        inputTokens: 4,
        estimatedCostUsd: 0.0001,
      }),
      getCachedEmbedding: async () => null,
      putCachedEmbedding: async () => undefined,
      cluster: () => ({ assignments: [0, 1], centroids: [[0.9], [0.1]] }),
      now: new Date('2026-07-14T12:00:00.000Z'),
    });

    expect(result.snapshot.clusters).toEqual([
      { id: 0, size: 1, label: 'python, sql' },
      { id: 1, size: 1, label: 'tableau' },
    ]);
    expect(result.snapshot.clusters.map((cluster) => cluster.label)).not.toContain('Theme 1');
  });

  it('publishes per-document corpusMeta for downstream pulse filters', async () => {
    const clusterDocs: AnalyzableDocument[] = [
      {
        id: 'jd-a',
        contentHash: 'hash-a',
        collectedAt: '2026-06-01T00:00:00.000Z',
        markdown: 'Python, SQL, and modelling experience.',
        seniority: 'senior',
        roleFamily: 'data-science',
        employerSizeTier: 'enterprise',
        employerPrestigeTier: 'elite',
      },
    ];

    const result = await analyseCorpus(clusterDocs, {
      embed: async () => ({
        vector: [0.9, 0.1, 0.2, 0.3],
        inputTokens: 4,
        estimatedCostUsd: 0.0001,
      }),
      getCachedEmbedding: async () => null,
      putCachedEmbedding: async () => undefined,
      now: new Date('2026-07-14T12:00:00.000Z'),
    });

    expect(result.snapshot.corpusMeta?.documents[0]).toMatchObject({
      id: 'jd-a',
      collectedAt: '2026-06-01T00:00:00.000Z',
      seniority: 'senior',
      roleFamily: 'data-science',
      employerSizeTier: 'enterprise',
      employerPrestigeTier: 'elite',
      technologies: ['python', 'sql'],
      clusterId: 0,
    });
  });

  it('applies owner theme label overrides when publishing clusters', async () => {
    const clusterDocs: AnalyzableDocument[] = [
      {
        id: 'jd-a',
        contentHash: 'hash-a',
        collectedAt: '2026-06-01T00:00:00.000Z',
        markdown: 'Python, SQL, and modelling experience.',
      },
      {
        id: 'jd-b',
        contentHash: 'hash-b',
        collectedAt: '2026-05-01T00:00:00.000Z',
        markdown: 'Tableau, communication, and stakeholder management.',
      },
    ];

    const result = await analyseCorpus(clusterDocs, {
      embed: async () => ({
        vector: [0.9, 0.1, 0.2, 0.3],
        inputTokens: 4,
        estimatedCostUsd: 0.0001,
      }),
      getCachedEmbedding: async () => null,
      putCachedEmbedding: async () => undefined,
      cluster: () => ({ assignments: [0, 1], centroids: [[0.9], [0.1]] }),
      themeLabelOverrides: {
        '1': 'Visual analytics demand',
      },
      now: new Date('2026-07-14T12:00:00.000Z'),
    });

    expect(result.snapshot.clusters).toEqual([
      { id: 0, size: 1, label: 'python, sql' },
      { id: 1, size: 1, label: 'Visual analytics demand' },
    ]);
  });
});

describe('analyseCorpus technologies pulse', () => {
  it('publishes curated technologies instead of bag-of-words tokens', async () => {
    const result = await analyseCorpus(docs, {
      embed: async () => ({
        vector: [0.1, 0.2, 0.3, 0.4],
        inputTokens: 4,
        estimatedCostUsd: 0.0001,
      }),
      getCachedEmbedding: async () => null,
      putCachedEmbedding: async () => undefined,
      now: new Date('2026-07-14T12:00:00.000Z'),
    });

    expect(result.snapshot.technologies).toEqual([
      { name: 'python', count: 3 },
      { name: 'sql', count: 2 },
      { name: 'tableau', count: 1 },
    ]);
    expect(result.snapshot.skills).toEqual(result.snapshot.technologies);
    expect(result.snapshot.technologies.map((item) => item.name)).not.toContain(
      'teamwork',
    );
    expect(result.snapshot.technologies.map((item) => item.name)).not.toContain(
      'communication',
    );
  });
});

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
