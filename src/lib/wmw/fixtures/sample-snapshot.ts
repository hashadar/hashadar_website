import type { WmwSnapshot } from '@/lib/wmw/types';

/** Minimal categories covering cash, vehicle, loan, and investables. */
export const SAMPLE_CATEGORIES: WmwSnapshot['categories'] = [
  {
    categoryId: 'CAT_CASH',
    type: 'Asset',
    class: 'Cash & Savings',
    sign: 1,
  },
  {
    categoryId: 'CAT_BROKERAGE',
    type: 'Asset',
    class: 'Brokerage',
    sign: 1,
  },
  {
    categoryId: 'CAT_VEHICLE',
    type: 'Asset',
    class: 'Cars',
    sign: 1,
  },
  {
    categoryId: 'CAT_LOAN',
    type: 'Liability',
    class: 'Loans',
    sign: -1,
  },
  {
    categoryId: 'CAT_CRYPTO',
    type: 'Asset',
    class: 'Cryptocurrency',
    sign: 1,
  },
];

/** Taycan-style financed pair plus cash / brokerage / exited crypto. */
export const SAMPLE_ACCOUNTS: WmwSnapshot['accounts'] = [
  {
    accountId: 'CASH_HSBC',
    accountName: 'HSBC Current',
    platform: 'HSBC',
    categoryId: 'CAT_CASH',
    currency: 'GBP',
    pairId: null,
  },
  {
    accountId: 'IBKR_ISA',
    accountName: 'IBKR ISA',
    platform: 'IBKR',
    categoryId: 'CAT_BROKERAGE',
    currency: 'GBP',
    pairId: null,
  },
  {
    accountId: 'CAR_PORSCHE',
    accountName: 'Porsche Taycan',
    platform: 'Private',
    categoryId: 'CAT_VEHICLE',
    currency: 'GBP',
    pairId: 'PAIR_TAYCAN',
  },
  {
    accountId: 'LOAN_MOTONOVO',
    accountName: 'Motonovo',
    platform: 'Motonovo',
    categoryId: 'CAT_LOAN',
    currency: 'GBP',
    pairId: 'PAIR_TAYCAN',
  },
  {
    accountId: 'CB_ETH',
    accountName: 'Coinbase ETH',
    platform: 'Coinbase',
    categoryId: 'CAT_CRYPTO',
    currency: 'GBP',
    pairId: null,
  },
];

/**
 * Multi-month Balances:
 * - Jan: cash + ISA + Taycan pair
 * - Feb: multi-Balance same month on ISA; crypto still open
 * - Mar: crypto exited at £0; cash omitted (missing ⇒ £0)
 */
export const SAMPLE_BALANCES: WmwSnapshot['balances'] = [
  {
    date: '2026-01-15',
    accountId: 'CASH_HSBC',
    balance: 5_000,
    units: null,
    mileage: null,
  },
  {
    date: '2026-01-20',
    accountId: 'IBKR_ISA',
    balance: 20_000,
    units: null,
    mileage: null,
  },
  {
    date: '2026-01-28',
    accountId: 'CAR_PORSCHE',
    balance: 80_000,
    units: null,
    mileage: 12_000,
  },
  {
    date: '2026-01-28',
    accountId: 'LOAN_MOTONOVO',
    balance: 50_000,
    units: null,
    mileage: null,
  },
  {
    date: '2026-01-10',
    accountId: 'CB_ETH',
    balance: 2_000,
    units: 1.2,
    mileage: null,
  },
  // February — two ISA rows; latest in-month wins
  {
    date: '2026-02-01',
    accountId: 'IBKR_ISA',
    balance: 21_000,
    units: null,
    mileage: null,
  },
  {
    date: '2026-02-27',
    accountId: 'IBKR_ISA',
    balance: 22_500,
    units: null,
    mileage: null,
  },
  {
    date: '2026-02-15',
    accountId: 'CASH_HSBC',
    balance: 4_500,
    units: null,
    mileage: null,
  },
  {
    date: '2026-02-28',
    accountId: 'CAR_PORSCHE',
    balance: 78_000,
    units: null,
    mileage: 12_400,
  },
  {
    date: '2026-02-28',
    accountId: 'LOAN_MOTONOVO',
    balance: 48_000,
    units: null,
    mileage: null,
  },
  {
    date: '2026-02-05',
    accountId: 'CB_ETH',
    balance: 1_800,
    units: 1.2,
    mileage: null,
  },
  // March — crypto exited £0; cash omitted; pair + ISA present
  {
    date: '2026-03-01',
    accountId: 'CB_ETH',
    balance: 0,
    units: 0,
    mileage: null,
  },
  {
    date: '2026-03-31',
    accountId: 'IBKR_ISA',
    balance: 23_000,
    units: null,
    mileage: null,
  },
  {
    date: '2026-03-31',
    accountId: 'CAR_PORSCHE',
    balance: 77_000,
    units: null,
    mileage: 12_800,
  },
  {
    date: '2026-03-31',
    accountId: 'LOAN_MOTONOVO',
    balance: 47_000,
    units: null,
    mileage: null,
  },
];

export function buildSampleSnapshot(
  overrides: Partial<WmwSnapshot> = {},
): WmwSnapshot {
  return {
    asOf: '2026-03-31T18:00:00.000Z',
    accounts: SAMPLE_ACCOUNTS,
    categories: SAMPLE_CATEGORIES,
    balances: SAMPLE_BALANCES,
    cashflows: [],
    warnings: [],
    ...overrides,
  };
}
