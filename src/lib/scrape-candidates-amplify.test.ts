import { describe, expect, it, vi } from 'vitest';
import {
  acceptScrapeCandidate,
  listPendingScrapeCandidates,
} from './scrape-candidates';
import {
  createAmplifyScrapeCandidateDeps,
  type AmplifyScrapeCandidateRow,
} from './scrape-candidates-amplify';

function row(
  overrides: Partial<AmplifyScrapeCandidateRow> & Pick<AmplifyScrapeCandidateRow, 'id'>,
): AmplifyScrapeCandidateRow {
  return {
    fileName: 'role.md',
    body: `---
collectedAt: 2026-01-15T00:00:00.000Z
title: Risk modeller
---

# Risk modeller
`,
    status: 'pending',
    title: 'Risk modeller',
    collectedAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  };
}

function createMemoryModelClient(initial: AmplifyScrapeCandidateRow[]) {
  const store = new Map(initial.map((item) => [item.id, { ...item }]));

  return {
    async get({ id }: { id: string }) {
      return { data: store.get(id) ?? null };
    },
    async list() {
      return { data: [...store.values()] };
    },
    async create(input: Omit<AmplifyScrapeCandidateRow, 'id'>) {
      const created = { id: `candidate-${store.size + 1}`, ...input };
      store.set(created.id, created);
      return { data: created };
    },
    async update(input: Pick<AmplifyScrapeCandidateRow, 'id' | 'status'> & Partial<AmplifyScrapeCandidateRow>) {
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

describe('createAmplifyScrapeCandidateDeps', () => {
  it('maps Amplify list/get/update into pending queue and accept transitions', async () => {
    const client = createMemoryModelClient([
      row({ id: 'candidate-1' }),
      row({ id: 'candidate-2', status: 'rejected' }),
    ]);
    const deps = createAmplifyScrapeCandidateDeps(client);
    const uploadJobDescription = vi.fn(async () => ({
      status: 'uploaded' as const,
      s3Key: 'raw/role.md',
    }));

    const pending = await listPendingScrapeCandidates(deps);
    expect(pending.map((item) => item.id)).toEqual(['candidate-1']);

    const result = await acceptScrapeCandidate('candidate-1', {
      ...deps,
      uploadJobDescription,
    });

    expect(result).toEqual({
      status: 'accepted',
      s3Key: 'raw/role.md',
      candidate: expect.objectContaining({ id: 'candidate-1', status: 'accepted' }),
    });
    expect(uploadJobDescription).toHaveBeenCalledOnce();
  });
});
