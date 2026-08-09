import { describe, expect, it } from 'vitest';
import { buildSampleSnapshot } from '@/lib/wmw/fixtures/sample-snapshot';
import { computePairEquity } from '@/lib/wmw/paired-accounts';

describe('computePairEquity', () => {
  it('computes Taycan-style pair equity as asset Balance minus liability Balance', () => {
    const pairs = computePairEquity(buildSampleSnapshot(), '2026-01');
    expect(pairs).toHaveLength(1);

    const taycan = pairs[0]!;
    expect(taycan.pairId).toBe('PAIR_TAYCAN');
    expect(taycan.asset?.accountId).toBe('CAR_PORSCHE');
    expect(taycan.liability?.accountId).toBe('LOAN_MOTONOVO');
    expect(taycan.asset?.balance).toBe(80_000);
    expect(taycan.liability?.balance).toBe(50_000);
    expect(taycan.equity).toBe(30_000);
    expect(taycan.netWorthContribution).toBe(30_000);
  });

  it('defaults to the headline Net Worth month', () => {
    const pairs = computePairEquity(buildSampleSnapshot());
    expect(pairs[0]?.month).toBe('2026-03');
    expect(pairs[0]?.equity).toBe(77_000 - 47_000);
  });

  it('treats a missing pair leg that month as £0 Balance', () => {
    const snapshot = buildSampleSnapshot({
      balances: [
        {
          date: '2026-04-15',
          accountId: 'CAR_PORSCHE',
          balance: 76_000,
          units: null,
          mileage: 13_000,
        },
        // LOAN_MOTONOVO omitted in April
      ],
    });

    const pairs = computePairEquity(snapshot, '2026-04');
    expect(pairs[0]?.asset?.balance).toBe(76_000);
    expect(pairs[0]?.liability?.balance).toBe(0);
    expect(pairs[0]?.equity).toBe(76_000);
  });

  it('ignores unpaired Accounts', () => {
    const pairs = computePairEquity(buildSampleSnapshot(), '2026-02');
    expect(pairs.map((p) => p.pairId)).toEqual(['PAIR_TAYCAN']);
  });

  it('returns an empty list when the Snapshot has no Balances and no month is given', () => {
    expect(
      computePairEquity(buildSampleSnapshot({ balances: [] })),
    ).toEqual([]);
  });
});
