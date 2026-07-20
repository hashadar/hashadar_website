import { describe, expect, it } from 'vitest';
import type { JobDescriptionCorpusRecord } from './job-market-corpus';
import type { EmployerRecord } from './job-market-employers';
import { getOwnerPayPrestigeAnalytics } from './job-market-pay-prestige-analytics';

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

describe('getOwnerPayPrestigeAnalytics', () => {
  it('aggregates compensation and tier breakdowns from active corpus records', async () => {
    const result = await getOwnerPayPrestigeAnalytics({
      listJobDescriptions: async () => [
        doc({
          id: 'jd-1',
          employerId: 'emp-1',
          compensationCurrency: 'GBP',
          compensationMin: 80000,
          compensationMax: 100000,
          compensationPeriod: 'year',
        }),
        doc({
          id: 'jd-2',
          employerId: 'emp-2',
          compensationCurrency: 'GBP',
          compensationMin: 60000,
          compensationMax: 70000,
          compensationPeriod: 'year',
        }),
        doc({
          id: 'jd-3',
          status: 'archived',
          employerId: 'emp-1',
          compensationCurrency: 'GBP',
          compensationMin: 50000,
          compensationPeriod: 'year',
        }),
        doc({ id: 'jd-4' }),
      ],
      listEmployers: async () => [
        employer({ id: 'emp-1', sizeTier: 'enterprise', prestigeTier: 'elite' }),
        employer({ id: 'emp-2', sizeTier: 'scaleup', prestigeTier: 'mid' }),
      ],
    });

    expect(result.activeDocumentCount).toBe(3);
    expect(result.missingDataRates).toEqual([
      { field: 'employerLink', present: 2, missing: 1, missingRate: 1 / 3 },
      {
        field: 'compensationCurrency',
        present: 2,
        missing: 1,
        missingRate: 1 / 3,
      },
      { field: 'compensationMin', present: 2, missing: 1, missingRate: 1 / 3 },
      { field: 'compensationMax', present: 2, missing: 1, missingRate: 1 / 3 },
      {
        field: 'compensationPeriod',
        present: 2,
        missing: 1,
        missingRate: 1 / 3,
      },
      {
        field: 'compensationDisclosed',
        present: 2,
        missing: 1,
        missingRate: 1 / 3,
      },
      {
        field: 'completeCompensation',
        present: 2,
        missing: 1,
        missingRate: 1 / 3,
      },
    ]);
    expect(result.compensationDisclosureBreakdown).toEqual([
      { disclosure: 'range', count: 2 },
      { disclosure: 'competitive', count: 0 },
      { disclosure: 'unknown', count: 1 },
    ]);
    expect(result.prestigeTierBreakdown).toEqual([
      { tier: 'low', count: 0 },
      { tier: 'mid', count: 1 },
      { tier: 'high', count: 0 },
      { tier: 'elite', count: 1 },
    ]);
    expect(result.sizeTierBreakdown).toEqual([
      { tier: 'startup', count: 0 },
      { tier: 'scaleup', count: 1 },
      { tier: 'enterprise', count: 1 },
      { tier: 'big4', count: 0 },
      { tier: 'other', count: 0 },
    ]);
    expect(result.compensationByCurrency).toEqual([
      {
        currency: 'GBP',
        count: 2,
        medianMin: 70000,
        medianMax: 85000,
      },
    ]);
  });

  it('reports honest missing-data rates when the active corpus is empty', async () => {
    const result = await getOwnerPayPrestigeAnalytics({
      listJobDescriptions: async () => [
        doc({ id: 'jd-archived', status: 'archived', employerId: 'emp-1' }),
      ],
      listEmployers: async () => [employer({ id: 'emp-1' })],
    });

    expect(result.activeDocumentCount).toBe(0);
    expect(result.missingDataRates).toEqual([
      { field: 'employerLink', present: 0, missing: 0, missingRate: 0 },
      { field: 'compensationCurrency', present: 0, missing: 0, missingRate: 0 },
      { field: 'compensationMin', present: 0, missing: 0, missingRate: 0 },
      { field: 'compensationMax', present: 0, missing: 0, missingRate: 0 },
      { field: 'compensationPeriod', present: 0, missing: 0, missingRate: 0 },
      { field: 'compensationDisclosed', present: 0, missing: 0, missingRate: 0 },
      { field: 'completeCompensation', present: 0, missing: 0, missingRate: 0 },
    ]);
    expect(result.compensationDisclosureBreakdown).toEqual([
      { disclosure: 'range', count: 0 },
      { disclosure: 'competitive', count: 0 },
      { disclosure: 'unknown', count: 0 },
    ]);
    expect(result.prestigeTierBreakdown).toEqual([
      { tier: 'low', count: 0 },
      { tier: 'mid', count: 0 },
      { tier: 'high', count: 0 },
      { tier: 'elite', count: 0 },
    ]);
    expect(result.sizeTierBreakdown).toEqual([
      { tier: 'startup', count: 0 },
      { tier: 'scaleup', count: 0 },
      { tier: 'enterprise', count: 0 },
      { tier: 'big4', count: 0 },
      { tier: 'other', count: 0 },
    ]);
    expect(result.compensationByCurrency).toEqual([]);
  });

  it('ignores employer links that do not resolve in the registry for tier counts', async () => {
    const result = await getOwnerPayPrestigeAnalytics({
      listJobDescriptions: async () => [
        doc({ id: 'jd-1', employerId: 'missing-employer' }),
        doc({ id: 'jd-2', employerId: 'emp-1' }),
      ],
      listEmployers: async () => [
        employer({ id: 'emp-1', sizeTier: 'big4', prestigeTier: 'high' }),
      ],
    });

    expect(result.missingDataRates).toContainEqual({
      field: 'employerLink',
      present: 2,
      missing: 0,
      missingRate: 0,
    });
    expect(result.prestigeTierBreakdown).toEqual([
      { tier: 'low', count: 0 },
      { tier: 'mid', count: 0 },
      { tier: 'high', count: 1 },
      { tier: 'elite', count: 0 },
    ]);
    expect(result.sizeTierBreakdown).toEqual([
      { tier: 'startup', count: 0 },
      { tier: 'scaleup', count: 0 },
      { tier: 'enterprise', count: 0 },
      { tier: 'big4', count: 1 },
      { tier: 'other', count: 0 },
    ]);
  });

  it('treats competitive disclosure as present, not missing compensation', async () => {
    const result = await getOwnerPayPrestigeAnalytics({
      listJobDescriptions: async () => [
        doc({ id: 'jd-1', compensationDisclosure: 'competitive' }),
        doc({ id: 'jd-2' }),
      ],
      listEmployers: async () => [],
    });

    expect(result.missingDataRates).toContainEqual({
      field: 'compensationDisclosed',
      present: 1,
      missing: 1,
      missingRate: 0.5,
    });
    expect(result.missingDataRates).toContainEqual({
      field: 'completeCompensation',
      present: 1,
      missing: 1,
      missingRate: 0.5,
    });
    expect(result.compensationDisclosureBreakdown).toEqual([
      { disclosure: 'range', count: 0 },
      { disclosure: 'competitive', count: 1 },
      { disclosure: 'unknown', count: 1 },
    ]);
  });
});
