import { describe, expect, it, vi } from 'vitest';
import type { JobDescriptionCorpusRecord } from './corpus';
import { executeAnalysisRun } from './run';

function doc(
  overrides: Partial<JobDescriptionCorpusRecord> & Pick<JobDescriptionCorpusRecord, 'id'>,
): JobDescriptionCorpusRecord {
  return {
    collectedAt: '2026-01-15T00:00:00.000Z',
    status: 'active',
    s3Key: `raw/${overrides.id}.md`,
    contentHash: `hash-${overrides.id}`,
    ...overrides,
  };
}

describe('executeAnalysisRun', () => {
  it('excludes archived documents from analysis and publishes on success', async () => {
    const store = new Map<string, JobDescriptionCorpusRecord>([
      ['active', doc({ id: 'active', title: 'Active role', seniority: 'senior' })],
      ['archived', doc({ id: 'archived', status: 'archived', title: 'Old role' })],
    ]);
    const publication = { currentSnapshotId: 'snap-old' };
    const snapshots = new Map<string, unknown>();
    const runs = new Map<string, { id: string; status: string }>([
      ['run-1', { id: 'run-1', status: 'queued' }],
    ]);

    const result = await executeAnalysisRun({
      runId: 'run-1',
      listJobDescriptions: async () => [...store.values()],
      saveJobDescription: async (record) => {
        store.set(record.id, record);
      },
      loadMarkdown: async (s3Key) =>
        s3Key.includes('archived')
          ? 'ARCHIVED SHOULD NOT APPEAR python'
          : 'Python SQL modelling experience required',
      embed: async () => ({
        vector: [0.1, 0.2, 0.3, 0.4],
        inputTokens: 8,
        estimatedCostUsd: 0.0002,
      }),
      getCachedEmbedding: async () => null,
      putCachedEmbedding: async () => undefined,
      saveSnapshot: async (snapshot) => {
        snapshots.set(snapshot.id, snapshot);
        return snapshot;
      },
      updateRun: async (run) => {
        runs.set(run.id, run);
        return run;
      },
      updatePublication: async (next) => {
        publication.currentSnapshotId = next.currentSnapshotId;
      },
      getPublication: async () => publication,
      createSnapshotId: () => 'snap-new',
      now: new Date('2026-07-14T12:00:00.000Z'),
    });

    expect(result.status).toBe('succeeded');
    expect(publication.currentSnapshotId).toBe('snap-new');
    expect(snapshots.get('snap-new')).toMatchObject({
      id: 'snap-new',
      payload: expect.objectContaining({
        documentCount: 1,
      }),
    });
    expect(JSON.stringify(snapshots.get('snap-new'))).not.toMatch(/ARCHIVED SHOULD NOT APPEAR/i);
    expect(runs.get('run-1')).toMatchObject({
      status: 'succeeded',
      docsConsidered: 1,
    });
  });

  it('keeps the last good publication when a run fails', async () => {
    const publication = { currentSnapshotId: 'snap-good' };
    const updatePublication = vi.fn();

    const result = await executeAnalysisRun({
      runId: 'run-fail',
      listJobDescriptions: async () => [doc({ id: 'active' })],
      saveJobDescription: async () => undefined,
      loadMarkdown: async () => {
        throw new Error('S3 unavailable');
      },
      embed: async () => ({
        vector: [0.1, 0.2],
        inputTokens: 1,
        estimatedCostUsd: 0.0001,
      }),
      getCachedEmbedding: async () => null,
      putCachedEmbedding: async () => undefined,
      saveSnapshot: async (snapshot) => snapshot,
      updateRun: async (run) => run,
      updatePublication,
      getPublication: async () => publication,
      createSnapshotId: () => 'snap-should-not-publish',
      now: new Date('2026-07-14T12:00:00.000Z'),
    });

    expect(result).toEqual({
      status: 'failed',
      reason: 'S3 unavailable',
    });
    expect(publication.currentSnapshotId).toBe('snap-good');
    expect(updatePublication).not.toHaveBeenCalled();
  });
});
