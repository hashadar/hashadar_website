import { describe, expect, it } from 'vitest';
import type { JobDescriptionCorpusRecord } from './job-market-corpus';
import type { EmployerRecord } from './job-market-employers';
import { createAmplifyPayPrestigeAnalyticsDeps } from './job-market-pay-prestige-analytics-amplify';
import { getOwnerPayPrestigeAnalytics } from './job-market-pay-prestige-analytics';

describe('createAmplifyPayPrestigeAnalyticsDeps', () => {
  it('wires corpus and employer list seams into owner analytics', async () => {
    const corpus: JobDescriptionCorpusRecord[] = [
      {
        id: 'jd-1',
        collectedAt: '2026-01-15T00:00:00.000Z',
        status: 'active',
        employerId: 'emp-1',
        compensationCurrency: 'GBP',
        compensationMin: 90000,
        compensationPeriod: 'year',
      },
    ];
    const employers: EmployerRecord[] = [
      {
        id: 'emp-1',
        name: 'Alpha Bank',
        sizeTier: 'enterprise',
        prestigeTier: 'high',
      },
    ];

    const deps = createAmplifyPayPrestigeAnalyticsDeps(
      {
        listJobDescriptions: async () => corpus,
      },
      {
        listEmployers: async () => employers,
      },
    );

    const result = await getOwnerPayPrestigeAnalytics(deps);

    expect(result.activeDocumentCount).toBe(1);
    expect(result.prestigeTierBreakdown).toContainEqual({ tier: 'high', count: 1 });
    expect(result.compensationByCurrency).toEqual([
      {
        currency: 'GBP',
        count: 1,
        medianMin: 90000,
        medianMax: undefined,
      },
    ]);
  });
});
