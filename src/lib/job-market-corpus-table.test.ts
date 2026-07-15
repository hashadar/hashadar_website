import { describe, expect, it } from 'vitest';
import {
  compensationSummary,
  displayTitle,
  filterCorpusRecords,
  hasMissingPay,
} from './job-market-corpus-table';
import type { JobDescriptionCorpusRecord } from './job-market-corpus';

const base: JobDescriptionCorpusRecord = {
  id: 'raw/a.md',
  s3Key: 'raw/a.md',
  collectedAt: '2026-07-01T00:00:00.000Z',
  status: 'active',
  title: 'Senior Scientist',
};

describe('filterCorpusRecords', () => {
  const records: JobDescriptionCorpusRecord[] = [
    base,
    {
      ...base,
      id: 'raw/b.md',
      s3Key: 'raw/b.md',
      title: 'Analyst',
      status: 'archived',
      employerId: 'emp-1',
      compensationCurrency: 'GBP',
      compensationMin: 1,
      compensationMax: 2,
      compensationPeriod: 'year',
    },
  ];

  it('filters by status and missing employer', () => {
    expect(
      filterCorpusRecords(records, {
        status: 'active',
        search: '',
        missingEmployer: true,
        missingPay: false,
      }).map((record) => record.id),
    ).toEqual(['raw/a.md']);
  });

  it('filters by search text', () => {
    expect(
      filterCorpusRecords(records, {
        status: 'all',
        search: 'analyst',
        missingEmployer: false,
        missingPay: false,
      }).map((record) => record.id),
    ).toEqual(['raw/b.md']);
  });
});

describe('corpus table helpers', () => {
  it('summarises compensation and gaps', () => {
    expect(displayTitle(base)).toBe('Senior Scientist');
    expect(hasMissingPay(base)).toBe(true);
    expect(compensationSummary(base)).toBe('—');
    expect(
      compensationSummary({
        ...base,
        compensationCurrency: 'GBP',
        compensationMin: 80_000,
        compensationMax: 100_000,
        compensationPeriod: 'year',
      }),
    ).toBe('GBP 80000–100000 / year');
  });
});
