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
  currency: string;
  /** Empty / null = unpaired. */
  pairId: string | null;
};

export type WmwCategory = {
  categoryId: string;
  type: string;
  class: string;
  sign: number;
};

export type WmwBalance = {
  date: string;
  accountId: string;
  balance: number;
  units: number | null;
  mileage: number | null;
};

/** v1 known Types; unknown strings are allowed but ignored for MWR. */
export type WmwCashflowType =
  | 'Contribution'
  | 'Withdrawal'
  | 'Loan Repayment'
  | (string & {});

export type WmwCashflow = {
  date: string;
  accountId: string;
  /** Account-perspective: into Account positive, out negative. */
  amount: number;
  transactionType: WmwCashflowType;
  description: string;
};

export type WmwSnapshot = {
  /** ISO datetime of the Snapshot as-of. */
  asOf: string;
  accounts: WmwAccount[];
  categories: WmwCategory[];
  balances: WmwBalance[];
  cashflows: WmwCashflow[];
};
