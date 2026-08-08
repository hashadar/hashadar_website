/**
 * Normalised WMW Snapshot contract (Workbook tabs after ingest).
 * Column sets match epic #179 / ADR 0010; dates are calendar ISO strings.
 */

export type WmwAccount = {
  accountId: string;
  accountName: string;
  platform: string;
  categoryId: string;
  /** v1 is GBP-only. */
  currency: string;
  /** Empty / null means unpaired. */
  pairId: string | null;
};

export type WmwCategory = {
  categoryId: string;
  /** Workbook Type, e.g. Asset | Liability. */
  type: string;
  class: string;
  /** +1 asset, -1 liability when rolling into Net Worth. */
  sign: number;
};

export type WmwBalance = {
  /** Calendar date YYYY-MM-DD. */
  date: string;
  accountId: string;
  balance: number;
  units: number | null;
  mileage: number | null;
};

/** v1 known Types; unknown strings may appear before ingest filtering. */
export type WmwCashflowTransactionType =
  | 'Contribution'
  | 'Withdrawal'
  | 'Loan Repayment';

export type WmwCashflow = {
  /** Calendar date YYYY-MM-DD. */
  date: string;
  accountId: string;
  /** Account-perspective signed Amount. */
  amount: number;
  transactionType: WmwCashflowTransactionType | string;
  description: string;
};

/** Point-in-time copy of Workbook facts held for the lab. */
export type WmwSnapshot = {
  /** ISO timestamp when the Snapshot was taken. */
  asOf: string;
  accounts: WmwAccount[];
  categories: WmwCategory[];
  balances: WmwBalance[];
  cashflows: WmwCashflow[];
};

/** Calendar month key YYYY-MM. */
export type CalendarMonth = string;
