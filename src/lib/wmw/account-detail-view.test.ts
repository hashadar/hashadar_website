import { describe, expect, it } from 'vitest';
import { buildWmwAccountDetailView } from '@/lib/wmw/account-detail-view';
import { buildSampleSnapshot } from '@/lib/wmw/fixtures/sample-snapshot';

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
    expect(view.balanceHistory.map((p) => p.balance)).toEqual([
      80_000, 78_000, 77_000,
    ]);
    expect(view.mileageHistory?.map((p) => p.value)).toEqual([
      12_000, 12_400, 12_800,
    ]);
    expect(view.unitsHistory).toBeNull();
    expect(view.cashflows).toEqual([]);
    expect(view.investable).toBe(false);
    expect(view.mwr).toEqual([]);
  });

  it('exposes Units history for crypto and Cashflows when present', () => {
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
        ],
      }),
      'CB_ETH',
    );

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') return;

    expect(view.unitsHistory?.map((p) => p.value)).toEqual([1.2, 1.2, 0]);
    expect(view.mileageHistory).toBeNull();
    expect(view.cashflows).toHaveLength(1);
    expect(view.investable).toBe(true);
    expect(view.mwr.map((row) => row.period)).toEqual(['YTD', '1Y', 'Max']);
  });

  it('omits Cashflow section data for cash Accounts (empty list)', () => {
    const view = buildWmwAccountDetailView(
      buildSampleSnapshot(),
      'CASH_HSBC',
    );

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') return;

    expect(view.cashflows).toEqual([]);
    expect(view.investable).toBe(false);
    expect(view.unitsHistory).toBeNull();
    expect(view.mileageHistory).toBeNull();
  });
});
