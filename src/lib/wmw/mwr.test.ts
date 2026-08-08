import { describe, expect, it } from 'vitest';
import {
  computeAccountAnnualisedMwr,
  computeInvestableAccountsAnnualisedMwr,
  INVESTABLE_CATEGORY_IDS,
  isInvestableAccount,
} from '@/lib/wmw/mwr';
import type {
  WmwAccount,
  WmwBalance,
  WmwCashflow,
  WmwCategory,
  WmwSnapshot,
} from '@/lib/wmw/types';

const CATEGORIES: WmwCategory[] = [
  { categoryId: 'CAT_BROKERAGE', type: 'Asset', class: 'Investments', sign: 1 },
  { categoryId: 'CAT_PENSION', type: 'Asset', class: 'Retirement', sign: 1 },
  { categoryId: 'CAT_CRYPTO', type: 'Asset', class: 'Cryptocurrency', sign: 1 },
  { categoryId: 'CAT_CASH', type: 'Asset', class: 'Cash & Savings', sign: 1 },
  { categoryId: 'CAT_VEHICLE', type: 'Asset', class: 'Cars', sign: 1 },
  { categoryId: 'CAT_LOAN', type: 'Liability', class: 'Loans', sign: -1 },
];

function account(
  accountId: string,
  categoryId: string,
  name = accountId,
): WmwAccount {
  return {
    accountId,
    accountName: name,
    platform: 'Test',
    categoryId,
    currency: 'GBP',
    pairId: null,
  };
}

function balance(
  accountId: string,
  date: string,
  value: number,
): WmwBalance {
  return {
    date,
    accountId,
    balance: value,
    units: null,
    mileage: null,
  };
}

function cashflow(
  accountId: string,
  date: string,
  amount: number,
  transactionType: string,
  description = '',
): WmwCashflow {
  return { date, accountId, amount, transactionType, description };
}

function snapshot(partial: {
  accounts: WmwAccount[];
  balances: WmwBalance[];
  cashflows?: WmwCashflow[];
  asOf?: string;
}): WmwSnapshot {
  return {
    asOf: partial.asOf ?? '2025-06-30T12:00:00.000Z',
    accounts: partial.accounts,
    categories: CATEGORIES,
    balances: partial.balances,
    cashflows: partial.cashflows ?? [],
    warnings: [],
  };
}

/** NPV of investor flows at an annualised rate (same day-count as the module). */
function npvAt(
  rate: number,
  flows: { years: number; amount: number }[],
): number {
  return flows.reduce(
    (sum, flow) => sum + flow.amount / (1 + rate) ** flow.years,
    0,
  );
}

describe('WMW investable allow-list', () => {
  it('allows only brokerage, pension, and crypto Categories', () => {
    expect([...INVESTABLE_CATEGORY_IDS]).toEqual([
      'CAT_BROKERAGE',
      'CAT_PENSION',
      'CAT_CRYPTO',
    ]);

    const snap = snapshot({
      accounts: [
        account('isa', 'CAT_BROKERAGE'),
        account('cash', 'CAT_CASH'),
        account('car', 'CAT_VEHICLE'),
        account('loan', 'CAT_LOAN'),
      ],
      balances: [balance('isa', '2025-01-01', 1000)],
    });

    expect(isInvestableAccount(snap, 'isa')).toBe(true);
    expect(isInvestableAccount(snap, 'cash')).toBe(false);
    expect(isInvestableAccount(snap, 'car')).toBe(false);
    expect(isInvestableAccount(snap, 'loan')).toBe(false);
  });

  it('marks non-investable Accounts as unavailable for MWR', () => {
    const snap = snapshot({
      accounts: [account('cash', 'CAT_CASH')],
      balances: [balance('cash', '2025-01-01', 5000)],
      cashflows: [cashflow('cash', '2025-02-01', 100, 'Contribution')],
    });

    const result = computeAccountAnnualisedMwr(snap, 'cash', 'Max');
    expect(result).toMatchObject({
      status: 'unavailable',
      reason: 'not-investable',
    });
  });
});

describe('WMW annualised per-Account MWR', () => {
  it('computes annualised MWR for a contribution series (investor IRR orientation)', () => {
    // Account-perspective: open 1000, contribute +1000 mid-year, close 2200.
    // Investor: −1000, −1000, +2200 over ~1 year.
    const snap = snapshot({
      asOf: '2025-01-01T00:00:00.000Z',
      accounts: [account('isa', 'CAT_BROKERAGE', 'ISA')],
      balances: [
        balance('isa', '2024-01-01', 1000),
        balance('isa', '2025-01-01', 2200),
      ],
      cashflows: [cashflow('isa', '2024-07-01', 1000, 'Contribution')],
    });

    const result = computeAccountAnnualisedMwr(snap, 'isa', 'Max');
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      return;
    }

    expect(result.label).toBe('annualised');
    expect(result.period).toBe('Max');
    expect(result.periodStart).toBe('2024-01-01');
    expect(result.periodEnd).toBe('2025-01-01');

    const yearsMid = 182 / 365.25; // 2024-01-01 → 2024-07-01
    const yearsEnd = 366 / 365.25; // leap year span
    const residual = npvAt(result.annualisedRate, [
      { years: 0, amount: -1000 },
      { years: yearsMid, amount: -1000 },
      { years: yearsEnd, amount: 2200 },
    ]);
    expect(Math.abs(residual)).toBeLessThan(1e-4);
    expect(result.annualisedRate).toBeGreaterThan(0.1);
    expect(result.annualisedRate).toBeLessThan(0.2);
  });

  it('treats withdrawals as investor inflows when negating account-perspective Amounts', () => {
    const snap = snapshot({
      asOf: '2025-01-01T00:00:00.000Z',
      accounts: [account('isa', 'CAT_BROKERAGE')],
      balances: [
        balance('isa', '2024-01-01', 2000),
        balance('isa', '2025-01-01', 900),
      ],
      cashflows: [cashflow('isa', '2024-07-01', -500, 'Withdrawal')],
    });

    const result = computeAccountAnnualisedMwr(snap, 'isa', 'Max');
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      return;
    }

    const yearsMid = 182 / 365.25;
    const yearsEnd = 366 / 365.25;
    // Withdrawal −500 account → +500 investor
    const residual = npvAt(result.annualisedRate, [
      { years: 0, amount: -2000 },
      { years: yearsMid, amount: 500 },
      { years: yearsEnd, amount: 900 },
    ]);
    expect(Math.abs(residual)).toBeLessThan(1e-4);
  });

  it('is unavailable when there is no Balance on or before period start (YTD)', () => {
    const snap = snapshot({
      asOf: '2025-06-30T12:00:00.000Z',
      accounts: [account('isa', 'CAT_BROKERAGE')],
      balances: [
        balance('isa', '2025-03-01', 1000),
        balance('isa', '2025-06-01', 1100),
      ],
      cashflows: [cashflow('isa', '2025-04-01', 100, 'Contribution')],
    });

    const result = computeAccountAnnualisedMwr(snap, 'isa', 'YTD');
    expect(result).toMatchObject({
      status: 'unavailable',
      reason: 'no-opening-balance',
    });
  });

  it('uses last Balance on or before period start as opening (1Y)', () => {
    const snap = snapshot({
      asOf: '2025-06-30T12:00:00.000Z',
      accounts: [account('sipp', 'CAT_PENSION')],
      balances: [
        balance('sipp', '2024-05-01', 800),
        balance('sipp', '2024-08-01', 850),
        balance('sipp', '2025-06-01', 1000),
      ],
      cashflows: [cashflow('sipp', '2024-12-01', 100, 'Contribution')],
    });

    const result = computeAccountAnnualisedMwr(snap, 'sipp', '1Y', {
      asOfDate: '2025-06-30',
    });
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      return;
    }
    expect(result.periodStart).toBe('2024-06-30');
    expect(result.periodEnd).toBe('2025-06-30');
    // Opening = 2024-05-01 (last on or before 2024-06-30), not synthesised
    const yearsCf =
      (Date.UTC(2024, 11, 1) - Date.UTC(2024, 5, 30)) /
      (365.25 * 24 * 60 * 60 * 1000);
    const yearsEnd =
      (Date.UTC(2025, 5, 1) - Date.UTC(2024, 5, 30)) /
      (365.25 * 24 * 60 * 60 * 1000);
    const residual = npvAt(result.annualisedRate, [
      { years: 0, amount: -800 },
      { years: yearsCf, amount: -100 },
      { years: yearsEnd, amount: 1000 },
    ]);
    expect(Math.abs(residual)).toBeLessThan(1e-4);
  });

  it('excludes Cashflows dated before the Account’s first Balance', () => {
    const snap = snapshot({
      accounts: [account('btc', 'CAT_CRYPTO')],
      balances: [
        balance('btc', '2024-06-01', 5000),
        balance('btc', '2025-06-01', 6000),
      ],
      cashflows: [
        cashflow('btc', '2024-01-01', 4000, 'Contribution', 'pre-history'),
        cashflow('btc', '2024-09-01', 200, 'Contribution'),
      ],
    });

    const withPreHistoryOnly = snapshot({
      accounts: [account('btc', 'CAT_CRYPTO')],
      balances: [
        balance('btc', '2024-06-01', 5000),
        balance('btc', '2025-06-01', 6000),
      ],
      cashflows: [
        cashflow('btc', '2024-01-01', 4000, 'Contribution', 'pre-history'),
      ],
    });

    expect(computeAccountAnnualisedMwr(withPreHistoryOnly, 'btc', 'Max')).toMatchObject({
      status: 'unavailable',
      reason: 'no-usable-cashflows',
    });

    const result = computeAccountAnnualisedMwr(snap, 'btc', 'Max');
    expect(result.status).toBe('available');
  });

  it('ignores Loan Repayment and unknown Types for MWR', () => {
    const snap = snapshot({
      accounts: [account('isa', 'CAT_BROKERAGE')],
      balances: [
        balance('isa', '2024-01-01', 1000),
        balance('isa', '2025-01-01', 1100),
      ],
      cashflows: [
        cashflow('isa', '2024-06-01', -50, 'Loan Repayment'),
        cashflow('isa', '2024-07-01', 25, 'Transfer'),
        cashflow('isa', '2024-08-01', 10, 'Dividend'),
      ],
    });

    expect(computeAccountAnnualisedMwr(snap, 'isa', 'Max')).toMatchObject({
      status: 'unavailable',
      reason: 'no-usable-cashflows',
    });
  });

  it('is unavailable when Balances exist but there are no usable Cashflows in the period', () => {
    const snap = snapshot({
      accounts: [account('legacy', 'CAT_CRYPTO')],
      balances: [
        balance('legacy', '2023-01-01', 100),
        balance('legacy', '2024-01-01', 400),
        balance('legacy', '2025-01-01', 900),
      ],
      cashflows: [],
    });

    expect(computeAccountAnnualisedMwr(snap, 'legacy', 'Max')).toMatchObject({
      status: 'unavailable',
      reason: 'no-usable-cashflows',
    });
  });

  it('does not invent a synthetic £0 opening', () => {
    const snap = snapshot({
      asOf: '2025-12-31T00:00:00.000Z',
      accounts: [account('isa', 'CAT_BROKERAGE')],
      balances: [balance('isa', '2025-06-01', 1000)],
      cashflows: [cashflow('isa', '2025-07-01', 100, 'Contribution')],
    });

    expect(computeAccountAnnualisedMwr(snap, 'isa', 'YTD')).toMatchObject({
      status: 'unavailable',
      reason: 'no-opening-balance',
    });
  });

  it('computes Max from first Balance through latest Balance', () => {
    const snap = snapshot({
      asOf: '2026-01-01T00:00:00.000Z',
      accounts: [account('isa', 'CAT_BROKERAGE')],
      balances: [
        balance('isa', '2022-03-15', 1000),
        balance('isa', '2023-03-15', 1200),
        balance('isa', '2024-03-15', 1500),
      ],
      cashflows: [cashflow('isa', '2022-09-01', 100, 'Contribution')],
    });

    const result = computeAccountAnnualisedMwr(snap, 'isa', 'Max');
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      return;
    }
    expect(result.periodStart).toBe('2022-03-15');
    expect(result.periodEnd).toBe('2024-03-15');
    expect(result.label).toBe('annualised');
  });

  it('lists annualised MWR only for investable Accounts', () => {
    const snap = snapshot({
      accounts: [
        account('isa', 'CAT_BROKERAGE'),
        account('cash', 'CAT_CASH'),
        account('sipp', 'CAT_PENSION'),
      ],
      balances: [
        balance('isa', '2024-01-01', 1000),
        balance('isa', '2025-01-01', 1200),
        balance('cash', '2024-01-01', 500),
        balance('sipp', '2024-01-01', 2000),
        balance('sipp', '2025-01-01', 2100),
      ],
      cashflows: [
        cashflow('isa', '2024-06-01', 50, 'Contribution'),
        cashflow('sipp', '2024-06-01', 80, 'Contribution'),
      ],
    });

    const results = computeInvestableAccountsAnnualisedMwr(snap, 'Max');
    expect(results.map((row) => row.accountId).sort()).toEqual(['isa', 'sipp']);
    expect(results.every((row) => row.status === 'available')).toBe(true);
    expect(
      results.every(
        (row) => row.status === 'available' && row.label === 'annualised',
      ),
    ).toBe(true);
  });
});
