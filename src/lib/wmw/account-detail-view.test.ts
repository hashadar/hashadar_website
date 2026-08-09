import { describe, expect, it } from 'vitest';
import {
  buildMonthlyMileageDeltas,
  buildReturnHistory,
  buildWmwAccountDetailView,
} from '@/lib/wmw/account-detail-view';
import { buildSampleSnapshot } from '@/lib/wmw/fixtures/sample-snapshot';

describe('buildMonthlyMileageDeltas', () => {
  it('converts cumulative Mileage into miles driven per calendar month', () => {
    expect(
      buildMonthlyMileageDeltas([
        { date: '2026-01-31', value: 12_000 },
        { date: '2026-02-28', value: 12_400 },
        { date: '2026-03-31', value: 12_800 },
      ]),
    ).toEqual([
      { date: '2026-02-28', value: 400 },
      { date: '2026-03-31', value: 400 },
    ]);
  });

  it('uses the last reading in a month when several exist', () => {
    expect(
      buildMonthlyMileageDeltas([
        { date: '2026-01-10', value: 10_000 },
        { date: '2026-01-31', value: 10_200 },
        { date: '2026-02-28', value: 10_500 },
      ]),
    ).toEqual([{ date: '2026-02-28', value: 300 }]);
  });
});

describe('buildReturnHistory', () => {
  it('strips mid-period Cashflows so contributions are not treated as return', () => {
    const points = buildReturnHistory(
      [
        { date: '2024-01-01', balance: 1000 },
        { date: '2024-06-01', balance: 1600 },
        { date: '2025-01-01', balance: 1800 },
      ],
      [
        {
          date: '2024-03-01',
          accountId: 'isa',
          amount: 500,
          transactionType: 'Contribution',
          description: 'Top-up',
        },
      ],
    );

    // First leg: (1600 - 1000 - 500) / 1000 = 10%; second: (1800 - 1600) / 1600 = 12.5%
    expect(points[0]).toMatchObject({ cumulativeReturn: 0 });
    expect(points[1]?.cumulativeReturn).toBeCloseTo(0.1, 6);
    expect(points[2]?.cumulativeReturn).toBeCloseTo(1.1 * 1.125 - 1, 6);
  });
});

describe('buildWmwAccountDetailView', () => {
  it('returns not-found for null Snapshot or unknown Account', () => {
    expect(buildWmwAccountDetailView(null, 'IBKR_ISA')).toEqual({
      status: 'not-found',
    });
    expect(
      buildWmwAccountDetailView(buildSampleSnapshot(), 'MISSING'),
    ).toEqual({ status: 'not-found' });
  });

  it('exposes metadata, Balance history, and Mileage for the vehicle Account', () => {
    const view = buildWmwAccountDetailView(
      buildSampleSnapshot(),
      'CAR_PORSCHE',
    );

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') return;

    expect(view.account.accountName).toBe('Porsche Taycan');
    expect(view.account.platform).toBe('Private');
    expect(view.account.pairId).toBe('PAIR_TAYCAN');
    expect(view.category?.class).toBe('Cars');
    expect(view.category?.type).toBe('Asset');
    expect(view.latestBalance).toBe(77_000);
    expect(view.balanceMomDelta).toBe(-1_000);
    expect(view.balanceMomPct).toBeCloseTo(-1_000 / 78_000, 6);
    expect(view.balanceHistory.map((p) => p.balance)).toEqual([
      80_000, 78_000, 77_000,
    ]);
    expect(view.returnHistory).toEqual([]);
    expect(view.mileageHistory?.map((p) => p.value)).toEqual([400, 400]);
    expect(view.unitsHistory).toBeNull();
    expect(view.cashflowSummary.count).toBe(0);
    expect(view.investable).toBe(false);
    expect(view.mwr).toEqual([]);
  });

  it('omits Performance series for cash and loan Accounts', () => {
    const cash = buildWmwAccountDetailView(buildSampleSnapshot(), 'CASH_HSBC');
    expect(cash.status).toBe('ready');
    if (cash.status === 'ready') {
      expect(cash.investable).toBe(false);
      expect(cash.returnHistory).toEqual([]);
    }

    const loan = buildWmwAccountDetailView(buildSampleSnapshot(), 'LOAN_MOTONOVO');
    expect(loan.status).toBe('ready');
    if (loan.status === 'ready') {
      expect(loan.investable).toBe(false);
      expect(loan.returnHistory).toEqual([]);
    }
  });

  it('exposes Units history for crypto and Cashflow summary when present', () => {
    const view = buildWmwAccountDetailView(
      buildSampleSnapshot({
        cashflows: [
          {
            date: '2026-01-05',
            accountId: 'CB_ETH',
            amount: 2_000,
            transactionType: 'Contribution',
            description: 'Buy ETH',
          },
          {
            date: '2026-02-01',
            accountId: 'CB_ETH',
            amount: -500,
            transactionType: 'Withdrawal',
            description: 'Partial',
          },
        ],
      }),
      'CB_ETH',
    );

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') return;

    expect(view.unitsHistory?.map((p) => p.value)).toEqual([1.2, 1.2, 0]);
    expect(view.mileageHistory).toBeNull();
    expect(view.cashflowSummary).toMatchObject({
      count: 2,
      netAmount: 1_500,
      contributionTotal: 2_000,
      withdrawalTotal: 500,
      lastDate: '2026-02-01',
    });
    expect(view.investable).toBe(true);
    expect(view.mwr.map((row) => row.period)).toEqual(['YTD', '1Y', 'Max']);
    expect(view.returnHistory.length).toBe(view.balanceHistory.length);
  });

  it('omits Cashflow section data for cash Accounts (empty summary)', () => {
    const view = buildWmwAccountDetailView(
      buildSampleSnapshot(),
      'CASH_HSBC',
    );

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') return;

    expect(view.cashflowSummary.count).toBe(0);
    expect(view.investable).toBe(false);
    expect(view.unitsHistory).toBeNull();
    expect(view.mileageHistory).toBeNull();
  });
});
