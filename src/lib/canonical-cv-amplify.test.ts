import { describe, expect, it } from 'vitest';
import {
  CANONICAL_CV_ID,
  createAmplifyCanonicalCvDeps,
  type AmplifyCanonicalCvModelClient,
  type AmplifyCanonicalCvRow,
} from './canonical-cv-amplify';
import { getCanonicalCv, saveCanonicalCv } from './canonical-cv';

function createMemoryModelClient(
  initial: AmplifyCanonicalCvRow | null,
): AmplifyCanonicalCvModelClient {
  let row = initial ? { ...initial } : null;

  return {
    async get({ id }) {
      if (!row || row.id !== id) {
        return { data: null };
      }
      return { data: row };
    },
    async create(input) {
      row = { ...input };
      return { data: row };
    },
    async update(input) {
      if (!row || row.id !== input.id) {
        return { data: null, errors: [{ message: 'not found' }] };
      }
      row = { ...row, ...input };
      return { data: row };
    },
  };
}

describe('createAmplifyCanonicalCvDeps', () => {
  it('maps Amplify get into facade load', async () => {
    const client = createMemoryModelClient({
      id: CANONICAL_CV_ID,
      body: '## Experience\n\nStored CV.',
      updatedAt: '2026-07-14T10:00:00.000Z',
    });
    const deps = createAmplifyCanonicalCvDeps(client);

    await expect(getCanonicalCv(deps)).resolves.toEqual({
      id: CANONICAL_CV_ID,
      body: '## Experience\n\nStored CV.',
      updatedAt: '2026-07-14T10:00:00.000Z',
    });
  });

  it('creates the fixed-id record on first save and updates thereafter', async () => {
    const client = createMemoryModelClient(null);
    const deps = createAmplifyCanonicalCvDeps(client);

    const created = await saveCanonicalCv('Initial body.', deps);
    expect(created.body).toBe('Initial body.');

    const updated = await saveCanonicalCv('Revised body.', deps);
    expect(updated.body).toBe('Revised body.');
    await expect(getCanonicalCv(deps)).resolves.toEqual(updated);
  });
});
