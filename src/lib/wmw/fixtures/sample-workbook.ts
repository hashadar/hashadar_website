/**
 * Unformatted Workbook shapes for Vitest (numeric money + Sheets date serials).
 * Mirrors the frozen column contract from epic #179 — no live Sheets / secrets.
 */

import type { WmwWorkbookRaw } from '@/lib/wmw/types';

/** 2024-01-15 as a Sheets serial (days since 1899-12-30). */
export const SERIAL_2024_01_15 = 45306;
/** 2024-02-01 */
export const SERIAL_2024_02_01 = 45323;
/** 2024-03-01 */
export const SERIAL_2024_03_01 = 45352;
/** 2024-06-15 */
export const SERIAL_2024_06_15 = 45458;

/** Minimal happy-path Workbook covering all four tabs. */
export function createSampleWorkbookRaw(): WmwWorkbookRaw {
  return {
    dim_Accounts: [
      [
        'Account_ID',
        'Account_Name',
        'Platform',
        'Category_ID',
        'Currency',
        'Pair_ID',
      ],
      ['ACC_ISA', 'Stocks & Shares ISA', 'AJ Bell', 'CAT_BROKERAGE', 'GBP', ''],
      ['ACC_SIPP', 'SIPP', 'AJ Bell', 'CAT_PENSION', 'GBP', ''],
      ['ACC_CASH', 'Easy Access', 'Chase', 'CAT_CASH', 'GBP', ''],
      ['ACC_CAR', 'Taycan', 'Porsche', 'CAT_VEHICLE', 'GBP', 'PAIR_TAYCAN'],
      [
        'ACC_CAR_LOAN',
        'Car finance',
        'Lender',
        'CAT_LOAN',
        'GBP',
        'PAIR_TAYCAN',
      ],
      ['ACC_USD', 'US brokerage', 'Schwab', 'CAT_BROKERAGE', 'USD', ''],
    ],
    dim_Categories: [
      ['Category_ID', 'Type', 'Class', 'Sign'],
      ['CAT_BROKERAGE', 'Asset', 'Investments', 1],
      ['CAT_PENSION', 'Asset', 'Retirement', 1],
      ['CAT_CASH', 'Asset', 'Cash & Savings', 1],
      ['CAT_VEHICLE', 'Asset', 'Cars', 1],
      ['CAT_LOAN', 'Liability', 'Loans', -1],
      ['CAT_CRYPTO', 'Asset', 'Cryptocurrency', 1],
    ],
    fact_Balances: [
      ['Date', 'Account_ID', 'Balance', 'Units', 'Mileage'],
      [SERIAL_2024_01_15, 'ACC_ISA', 10000, '', ''],
      [SERIAL_2024_02_01, 'ACC_ISA', 10500.5, '', ''],
      [SERIAL_2024_02_01, 'ACC_SIPP', 50000, '', ''],
      [SERIAL_2024_02_01, 'ACC_CASH', 2500, '', ''],
      [SERIAL_2024_02_01, 'ACC_CAR', 70000, '', 12000],
      [SERIAL_2024_02_01, 'ACC_CAR_LOAN', 25000, '', ''],
      [SERIAL_2024_02_01, 'ACC_USD', 999, '', ''],
    ],
    fact_Cashflows: [
      ['Date', 'Account_ID', 'Amount', 'Transaction_Type', 'Description'],
      [
        SERIAL_2024_01_15,
        'ACC_ISA',
        1000,
        'Contribution',
        'Personal top-up',
      ],
      [
        SERIAL_2024_03_01,
        'ACC_ISA',
        -200,
        'Withdrawal',
        'Partial withdrawal',
      ],
      [
        SERIAL_2024_06_15,
        'ACC_CAR_LOAN',
        -350,
        'Loan Repayment',
        'Monthly payment',
      ],
      [
        SERIAL_2024_06_15,
        'ACC_ISA',
        50,
        'Transfer',
        'Should be excluded from MWR',
      ],
      [
        SERIAL_2024_06_15,
        'ACC_ISA',
        25,
        'Dividend',
        'Unknown type — warn + exclude',
      ],
    ],
  };
}

/** Same sample with a column renamed to exercise frozen-header validation. */
export function createWorkbookMissingBalanceColumn(): WmwWorkbookRaw {
  const raw = createSampleWorkbookRaw();
  return {
    ...raw,
    fact_Balances: [
      ['Date', 'Account_ID', 'Value', 'Units', 'Mileage'],
      [SERIAL_2024_01_15, 'ACC_ISA', 10000, '', ''],
    ],
  };
}
