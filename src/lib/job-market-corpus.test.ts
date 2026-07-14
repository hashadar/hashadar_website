import { describe, expect, it } from 'vitest';
import {
  archiveJobDescription,
  prepareActiveCorpusForAnalysis,
  restoreJobDescription,
  type JobDescriptionCorpusRecord,
} from './job-market-corpus';

function doc(
  overrides: Partial<JobDescriptionCorpusRecord> & Pick<JobDescriptionCorpusRecord, 'id'>,
): JobDescriptionCorpusRecord {
  return {
    collectedAt: '2026-01-15T00:00:00.000Z',
    status: 'active',
    ...overrides,
  };
}

describe('archiveJobDescription', () => {
  it('soft-archives an active JobDescription so it no longer counts as active for analysis', async () => {
    const store = new Map<string, JobDescriptionCorpusRecord>([
      ['jd-1', doc({ id: 'jd-1' })],
      ['jd-2', doc({ id: 'jd-2' })],
    ]);

    const result = await archiveJobDescription('jd-1', {
      getJobDescription: async (id) => store.get(id) ?? null,
      saveJobDescription: async (record) => {
        store.set(record.id, record);
      },
    });

    expect(result).toEqual({
      status: 'archived',
      record: expect.objectContaining({ id: 'jd-1', status: 'archived' }),
    });
    expect(store.get('jd-1')?.status).toBe('archived');
    expect(store.has('jd-1')).toBe(true);

    const active = await prepareActiveCorpusForAnalysis({
      listJobDescriptions: async () => [...store.values()],
      saveJobDescription: async (record) => {
        store.set(record.id, record);
      },
      now: new Date('2026-07-14T00:00:00.000Z'),
    });

    expect(active.map((record) => record.id)).toEqual(['jd-2']);
  });

  it('keeps soft-archived records recoverable without hard delete', async () => {
    const store = new Map<string, JobDescriptionCorpusRecord>([
      ['jd-1', doc({ id: 'jd-1', status: 'archived' })],
    ]);

    const restored = await restoreJobDescription('jd-1', {
      getJobDescription: async (id) => store.get(id) ?? null,
      saveJobDescription: async (record) => {
        store.set(record.id, record);
      },
    });

    expect(restored).toEqual({
      status: 'restored',
      record: expect.objectContaining({ id: 'jd-1', status: 'active' }),
    });
    expect(store.get('jd-1')).toEqual(
      expect.objectContaining({ id: 'jd-1', status: 'active' }),
    );
  });
});

describe('prepareActiveCorpusForAnalysis', () => {
  it('auto-archives documents older than the configured age window during the sweep', async () => {
    const store = new Map<string, JobDescriptionCorpusRecord>([
      [
        'old',
        doc({
          id: 'old',
          collectedAt: '2024-01-01T00:00:00.000Z',
        }),
      ],
      [
        'fresh',
        doc({
          id: 'fresh',
          collectedAt: '2026-06-01T00:00:00.000Z',
        }),
      ],
    ]);

    const active = await prepareActiveCorpusForAnalysis({
      listJobDescriptions: async () => [...store.values()],
      saveJobDescription: async (record) => {
        store.set(record.id, record);
      },
      now: new Date('2026-07-14T00:00:00.000Z'),
      maxAgeMonths: 18,
    });

    expect(store.get('old')?.status).toBe('archived');
    expect(store.get('fresh')?.status).toBe('active');
    expect(active.map((record) => record.id)).toEqual(['fresh']);
  });

  it('excludes archived documents from the active analysis corpus', async () => {
    const active = await prepareActiveCorpusForAnalysis({
      listJobDescriptions: async () => [
        doc({ id: 'active-1', status: 'active' }),
        doc({ id: 'archived-1', status: 'archived' }),
        doc({ id: 'active-2', status: 'active' }),
      ],
      saveJobDescription: async () => undefined,
      now: new Date('2026-07-14T00:00:00.000Z'),
    });

    expect(active.map((record) => record.id)).toEqual(['active-1', 'active-2']);
  });

  it('treats the age window as exclusive of the exact cutoff instant', async () => {
    const store = new Map<string, JobDescriptionCorpusRecord>([
      [
        'on-cutoff',
        doc({
          id: 'on-cutoff',
          // Exactly 18 months before now
          collectedAt: '2025-01-14T00:00:00.000Z',
        }),
      ],
    ]);

    const active = await prepareActiveCorpusForAnalysis({
      listJobDescriptions: async () => [...store.values()],
      saveJobDescription: async (record) => {
        store.set(record.id, record);
      },
      now: new Date('2026-07-14T00:00:00.000Z'),
      maxAgeMonths: 18,
    });

    expect(store.get('on-cutoff')?.status).toBe('active');
    expect(active.map((record) => record.id)).toEqual(['on-cutoff']);
  });
});
