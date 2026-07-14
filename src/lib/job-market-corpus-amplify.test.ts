import { describe, expect, it, vi } from 'vitest';
import {
  archiveJobDescription,
  restoreJobDescription,
  type JobDescriptionCorpusRecord,
} from './job-market-corpus';
import {
  createAmplifyCorpusDeps,
  type AmplifyJobDescriptionModelClient,
  type AmplifyJobDescriptionRow,
} from './job-market-corpus-amplify';

function row(
  overrides: Partial<AmplifyJobDescriptionRow> & Pick<AmplifyJobDescriptionRow, 'id'>,
): AmplifyJobDescriptionRow {
  return {
    s3Key: `keys/${overrides.id}.md`,
    contentHash: 'hash',
    collectedAt: '2026-01-15T00:00:00.000Z',
    status: 'active',
    title: 'Quant analyst',
    ...overrides,
  };
}

function createMemoryModelClient(
  initial: AmplifyJobDescriptionRow[],
): AmplifyJobDescriptionModelClient & { deleteS3: (key: string) => Promise<void> } {
  const store = new Map(initial.map((item) => [item.id, { ...item }]));
  const deleteS3 = vi.fn(async () => {
    throw new Error('S3 delete must never be called for soft-archive');
  });

  return {
    deleteS3,
    async get({ id }) {
      return { data: store.get(id) ?? null };
    },
    async list() {
      return { data: [...store.values()] };
    },
    async update(input) {
      const existing = store.get(input.id);
      if (!existing) {
        return { data: null, errors: [{ message: 'not found' }] };
      }
      const next = { ...existing, ...input };
      store.set(input.id, next);
      return { data: next };
    },
  };
}

describe('createAmplifyCorpusDeps', () => {
  it('maps Amplify get/update into archive and restore without deleting storage', async () => {
    const client = createMemoryModelClient([
      row({ id: 'jd-1', status: 'active', title: 'Risk modeller' }),
    ]);
    const deps = createAmplifyCorpusDeps(client);

    const archived = await archiveJobDescription('jd-1', deps);
    expect(archived).toEqual({
      status: 'archived',
      record: expect.objectContaining({ id: 'jd-1', status: 'archived' }),
    });
    expect(client.deleteS3).not.toHaveBeenCalled();

    const listed = await deps.listJobDescriptions();
    expect(listed).toEqual([
      expect.objectContaining({
        id: 'jd-1',
        title: 'Risk modeller',
        status: 'archived',
      }),
    ]);

    const restored = await restoreJobDescription('jd-1', deps);
    expect(restored).toEqual({
      status: 'restored',
      record: expect.objectContaining({ id: 'jd-1', status: 'active' }),
    });
    expect(client.deleteS3).not.toHaveBeenCalled();

    const afterRestore = await deps.getJobDescription('jd-1');
    expect(afterRestore).toEqual(
      expect.objectContaining({
        id: 'jd-1',
        status: 'active',
        s3Key: 'keys/jd-1.md',
      } satisfies Partial<JobDescriptionCorpusRecord>),
    );
  });
});
