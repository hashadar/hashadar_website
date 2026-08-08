import { describe, expect, it } from 'vitest';
import { buildSampleSnapshot } from '@/lib/wmw/fixtures/sample-snapshot';
import {
  computeNetWorth,
  computeNetWorthForMonth,
} from '@/lib/wmw/net-worth';

describe('computeNetWorth', () => {
  it('uses latest in-month Balance when an Account has multiple rows', () => {
    const result = computeNetWorth(buildSampleSnapshot());
    const feb = result.months.find((m) => m.month === '2026-02');
    expect(feb).toBeDefined();
    const isa = feb!.byAccount.find((a) => a.accountId === 'IBKR_ISA');
    expect(isa?.balance).toBe(22_500);
    expect(isa?.contribution).toBe(22_500);
  });

  it('treats a missing Account month as £0 (no carry-forward)', () => {
    const result = computeNetWorth(buildSampleSnapshot());
    const mar = result.months.find((m) => m.month === '2026-03');
    expect(mar).toBeDefined();
    expect(
      mar!.byAccount.find((a) => a.accountId === 'CASH_HSBC'),
    ).toBeUndefined();

    // Jan cash 5_000 must not carry into March total
    const expectedWithoutCash =
      23_000 + // ISA
      77_000 + // car
      -47_000 + // loan
      0; // exited crypto
    expect(mar!.total).toBe(expectedWithoutCash);
  });

  it('includes explicit £0 exit Balances in the month breakdown', () => {
    const result = computeNetWorth(buildSampleSnapshot());
    const mar = result.months.find((m) => m.month === '2026-03');
    const eth = mar!.byAccount.find((a) => a.accountId === 'CB_ETH');
    expect(eth).toEqual(
      expect.objectContaining({
        balance: 0,
        contribution: 0,
        class: 'Cryptocurrency',
      }),
    );
  });

  it('headline is the latest month that has any Balances', () => {
    const result = computeNetWorth(buildSampleSnapshot());
    expect(result.headline?.month).toBe('2026-03');
    expect(result.months.map((m) => m.month)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
  });

  it('applies Category Sign to contributions and Class roll-up', () => {
    const result = computeNetWorth(buildSampleSnapshot());
    const jan = result.months.find((m) => m.month === '2026-01')!;

    expect(jan.total).toBe(
      5_000 + 20_000 + 80_000 + -50_000 + 2_000,
    );

    const loan = jan.byAccount.find((a) => a.accountId === 'LOAN_MOTONOVO');
    expect(loan?.sign).toBe(-1);
    expect(loan?.contribution).toBe(-50_000);

    const cars = jan.byClass.find((c) => c.class === 'Cars');
    const loans = jan.byClass.find((c) => c.class === 'Loans');
    expect(cars?.contribution).toBe(80_000);
    expect(loans?.contribution).toBe(-50_000);
  });

  it('returns null headline and empty series when there are no Balances', () => {
    const result = computeNetWorth(
      buildSampleSnapshot({ balances: [] }),
    );
    expect(result.months).toEqual([]);
    expect(result.headline).toBeNull();
  });
});

describe('computeNetWorthForMonth', () => {
  it('returns £0 total for a calendar month with no Balances', () => {
    const month = computeNetWorthForMonth(buildSampleSnapshot(), '2025-12');
    expect(month).toEqual({
      month: '2025-12',
      total: 0,
      byAccount: [],
      byClass: [],
    });
  });
});
