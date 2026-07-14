import { describe, expect, it, vi } from 'vitest';
import {
  getPublishedJobMarketSnapshot,
  startJobMarketRecompute,
  uploadJobDescription,
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

  it('does not expose compensation, prestige, or employer registry fields', async () => {
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
          compensationMin: 120000,
          compensationMax: 150000,
          compensationCurrency: 'GBP',
          compensationPeriod: 'year',
          prestigeTier: 'elite',
          sizeTier: 'enterprise',
          employers: [{ id: 'emp-1', name: 'Secret Bank' }],
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

describe('uploadJobDescription', () => {
  it('rejects markdown without YAML frontmatter before storage write', async () => {
    const putRawObject = vi.fn(async () => undefined);

    const result = await uploadJobDescription(
      { fileName: 'missing-frontmatter.md', body: '# Role title\n\nBody copy.' },
      { putRawObject },
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Missing YAML frontmatter',
    });
    expect(putRawObject).not.toHaveBeenCalled();
  });

  it('rejects markdown with missing collectedAt before storage write', async () => {
    const putRawObject = vi.fn(async () => undefined);

    const result = await uploadJobDescription(
      {
        fileName: 'missing-collected-at.md',
        body: '---\ntitle: Sample role\n---\n\nBody copy.',
      },
      { putRawObject },
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Frontmatter requires a valid collectedAt',
    });
    expect(putRawObject).not.toHaveBeenCalled();
  });

  it('uploads valid markdown to the raw/ prefix via injected storage', async () => {
    const putRawObject = vi.fn(async () => undefined);
    const body = `---
collectedAt: 2026-06-15T10:00:00.000Z
title: Senior Data Scientist
---

# Senior Data Scientist
`;

    const result = await uploadJobDescription(
      { fileName: 'senior-data-scientist.md', body },
      { putRawObject },
    );

    expect(result).toEqual({
      status: 'uploaded',
      s3Key: 'raw/senior-data-scientist.md',
    });
    expect(putRawObject).toHaveBeenCalledOnce();
    expect(putRawObject).toHaveBeenCalledWith({
      key: 'raw/senior-data-scientist.md',
      body,
    });
  });

  it('does not start corpus recompute on upload', async () => {
    const putRawObject = vi.fn(async () => undefined);
    const startRecompute = vi.fn(async () => ({ status: 'started', runId: 'run-1' }));
    const body = `---
collectedAt: 2026-06-15T10:00:00.000Z
---

# Role
`;

    const result = await uploadJobDescription(
      { fileName: 'role.md', body },
      { putRawObject },
    );

    expect(result.status).toBe('uploaded');
    expect(putRawObject).toHaveBeenCalledOnce();
    expect(startRecompute).not.toHaveBeenCalled();
  });

  it('rejects clearly from the default path when the upload client is not configured', async () => {
    const result = await uploadJobDescription({
      fileName: 'role.md',
      body: `---
collectedAt: 2026-06-15T10:00:00.000Z
---

# Role
`,
    });

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Upload client is not configured',
    });
  });
});
