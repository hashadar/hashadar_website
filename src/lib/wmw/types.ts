/**
 * WMW Snapshot domain types — mirror the frozen Workbook contract from epic #179 /
 * ADR 0010. Dates are ISO calendar days (YYYY-MM-DD) after ingest parses Sheet serials.
 * Amounts are GBP; Cashflow Amounts are account-perspective (into Account positive).
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
  /** +1 asset, −1 liability when rolling into Net Worth. */
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

/**
 * v1 known Transaction_Type values. Unknown strings are allowed (open union) but
 * ignored for MWR; ingest may filter before Snapshot persist.
 */
export type WmwCashflowTransactionType =
  | 'Contribution'
  | 'Withdrawal'
  | 'Loan Repayment'
  | (string & {});

/** Alias kept so MWR and Net Worth call sites share one vocabulary. */
export type WmwCashflowType = WmwCashflowTransactionType;

export type WmwCashflow = {
  /** Calendar date YYYY-MM-DD. */
  date: string;
  accountId: string;
  /** Account-perspective: into Account positive, out negative. */
  amount: number;
  transactionType: WmwCashflowTransactionType;
  description: string;
};

/** Point-in-time copy of Workbook facts held for the lab. */
export type WmwSnapshot = {
  /** ISO timestamp when the Snapshot was taken (as-of). */
  asOf: string;
  accounts: WmwAccount[];
  categories: WmwCategory[];
  balances: WmwBalance[];
  cashflows: WmwCashflow[];
};

/** Calendar month key YYYY-MM. */
export type CalendarMonth = string;
