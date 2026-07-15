import { describe, expect, it } from 'vitest';
import {
  createEmployer,
  listEmployers,
  updateEmployer,
  updateJobDescriptionStructuredFields,
  type EmployerRecord,
} from './job-market-employers';
import type { JobDescriptionCorpusRecord } from './job-market-corpus';

function employer(
  overrides: Partial<EmployerRecord> & Pick<EmployerRecord, 'id'>,
): EmployerRecord {
  return {
    name: 'Acme Bank',
    sizeTier: 'enterprise',
    prestigeTier: 'high',
    ...overrides,
  };
}

function doc(
  overrides: Partial<JobDescriptionCorpusRecord> & Pick<JobDescriptionCorpusRecord, 'id'>,
): JobDescriptionCorpusRecord {
  return {
    collectedAt: '2026-01-15T00:00:00.000Z',
    status: 'active',
    title: 'Data scientist',
    ...overrides,
  };
}

describe('createEmployer', () => {
  it('creates an employer with owner-defined size and prestige tiers', async () => {
    const store: EmployerRecord[] = [];

    const result = await createEmployer(
      { name: 'Globex Capital', sizeTier: 'scaleup', prestigeTier: 'mid' },
      {
        insertEmployer: async (input) => {
          const record = { id: 'emp-1', ...input };
          store.push(record);
          return record;
        },
      },
    );

    expect(result).toEqual({
      status: 'created',
      employer: {
        id: 'emp-1',
        name: 'Globex Capital',
        sizeTier: 'scaleup',
        prestigeTier: 'mid',
      },
    });
    expect(store).toHaveLength(1);
  });

  it('rejects blank employer names', async () => {
    const result = await createEmployer(
      { name: '   ', sizeTier: 'startup', prestigeTier: 'low' },
      {
        insertEmployer: async () => {
          throw new Error('must not save');
        },
      },
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Employer name is required',
    });
  });

  it('rejects uncontrolled size or prestige tiers', async () => {
    const result = await createEmployer(
      { name: 'Acme', sizeTier: 'mega-corp' as never, prestigeTier: 'high' },
      {
        insertEmployer: async () => {
          throw new Error('must not save');
        },
      },
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Unrecognised employer size tier',
    });
  });
});

describe('updateEmployer', () => {
  it('updates an existing employer record', async () => {
    const store = new Map([['emp-1', employer({ id: 'emp-1' })]]);

    const result = await updateEmployer(
      { id: 'emp-1', name: 'Acme Holdings', sizeTier: 'big4', prestigeTier: 'elite' },
      {
        getEmployer: async (id) => store.get(id) ?? null,
        persistEmployer: async (record) => {
          store.set(record.id, record);
        },
      },
    );

    expect(result).toEqual({
      status: 'updated',
      employer: {
        id: 'emp-1',
        name: 'Acme Holdings',
        sizeTier: 'big4',
        prestigeTier: 'elite',
      },
    });
  });

  it('returns not_found when the employer does not exist', async () => {
    const result = await updateEmployer(
      { id: 'missing', name: 'Ghost', sizeTier: 'other', prestigeTier: 'low' },
      {
        getEmployer: async () => null,
        persistEmployer: async () => undefined,
      },
    );

    expect(result).toEqual({ status: 'not_found' });
  });
});

describe('listEmployers', () => {
  it('returns the owner employer registry via injected deps', async () => {
    const employers = [
      employer({ id: 'emp-1', name: 'Alpha' }),
      employer({ id: 'emp-2', name: 'Beta', sizeTier: 'startup' }),
    ];

    const result = await listEmployers({
      listEmployers: async () => employers,
    });

    expect(result).toEqual(employers);
  });
});

describe('updateJobDescriptionStructuredFields', () => {
  it('links a job description to an employer and stores controlled metadata', async () => {
    const store = new Map([
      ['jd-1', doc({ id: 'jd-1' })],
    ]);
    const employers = new Map([['emp-1', employer({ id: 'emp-1' })]]);

    const result = await updateJobDescriptionStructuredFields(
      'jd-1',
      {
        employerId: 'emp-1',
        seniority: 'senior',
        roleFamily: 'data_science',
        compensationCurrency: 'GBP',
        compensationMin: 80000,
        compensationMax: 95000,
        compensationPeriod: 'year',
      },
      {
        getJobDescription: async (id) => store.get(id) ?? null,
        saveJobDescription: async (record) => {
          store.set(record.id, record);
        },
        getEmployer: async (id) => employers.get(id) ?? null,
      },
    );

    expect(result).toEqual({
      status: 'updated',
      record: expect.objectContaining({
        id: 'jd-1',
        employerId: 'emp-1',
        seniority: 'senior',
        roleFamily: 'data_science',
        compensationCurrency: 'GBP',
        compensationMin: 80000,
        compensationMax: 95000,
        compensationPeriod: 'year',
      }),
    });
  });

  it('rejects uncontrolled seniority or role family values', async () => {
    const store = new Map([['jd-1', doc({ id: 'jd-1' })]]);

    const result = await updateJobDescriptionStructuredFields(
      'jd-1',
      { seniority: 'super-senior' as never },
      {
        getJobDescription: async (id) => store.get(id) ?? null,
        saveJobDescription: async () => undefined,
        getEmployer: async () => null,
      },
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Unrecognised seniority value',
    });
  });

  it('rejects linking to a missing employer', async () => {
    const store = new Map([['jd-1', doc({ id: 'jd-1' })]]);

    const result = await updateJobDescriptionStructuredFields(
      'jd-1',
      { employerId: 'emp-missing' },
      {
        getJobDescription: async (id) => store.get(id) ?? null,
        saveJobDescription: async () => undefined,
        getEmployer: async () => null,
      },
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Employer not found',
    });
  });

  it('clears optional structured fields when explicitly set to null', async () => {
    const store = new Map([
      [
        'jd-1',
        doc({
          id: 'jd-1',
          employerId: 'emp-1',
          seniority: 'lead',
          roleFamily: 'engineering',
          compensationCurrency: 'USD',
          compensationMin: 120000,
          compensationMax: 140000,
          compensationPeriod: 'year',
        }),
      ],
    ]);

    const result = await updateJobDescriptionStructuredFields(
      'jd-1',
      {
        employerId: null,
        compensationCurrency: null,
        compensationMin: null,
        compensationMax: null,
        compensationPeriod: null,
      },
      {
        getJobDescription: async (id) => store.get(id) ?? null,
        saveJobDescription: async (record) => {
          store.set(record.id, record);
        },
        getEmployer: async () => null,
      },
    );

    expect(result).toEqual({
      status: 'updated',
      record: expect.objectContaining({
        id: 'jd-1',
        employerId: undefined,
        seniority: 'lead',
        roleFamily: 'engineering',
        compensationCurrency: undefined,
        compensationMin: undefined,
        compensationMax: undefined,
        compensationPeriod: undefined,
      }),
    });
  });
});
