/**
 * WMW Snapshot domain types — frozen Workbook contract from epic #179 /
 * ADR 0009 / ADR 0010. Shared across storage (#182), ingest (#183), Net Worth
 * (#184), and MWR (#185). Dates are ISO calendar days (YYYY-MM-DD) after ingest
 * parses Sheet serials. Amounts are GBP; Cashflow Amounts are account-perspective
 * (into Account positive).
 */

export const WMW_WORKBOOK_TABS = [
  'dim_Accounts',
  'dim_Categories',
  'fact_Balances',
  'fact_Cashflows',
] as const;

export type WmwWorkbookTab = (typeof WMW_WORKBOOK_TABS)[number];

export const WMW_ACCOUNT_COLUMNS = [
  'Account_ID',
  'Account_Name',
  'Platform',
  'Category_ID',
  'Currency',
  'Pair_ID',
] as const;

export const WMW_CATEGORY_COLUMNS = [
  'Category_ID',
  'Type',
  'Class',
  'Sign',
] as const;

export const WMW_BALANCE_COLUMNS = [
  'Date',
  'Account_ID',
  'Balance',
  'Units',
  'Mileage',
] as const;

export const WMW_CASHFLOW_COLUMNS = [
  'Date',
  'Account_ID',
  'Amount',
  'Transaction_Type',
  'Description',
] as const;

/** v1 known Transaction_Type values (epic #179 / ADR 0010). */
export const WMW_CASHFLOW_TRANSACTION_TYPES = [
  'Contribution',
  'Withdrawal',
  'Loan Repayment',
] as const;

/**
 * Open union: known Types plus unknown Sheet strings. MWR ignores unknowns;
 * ingest may filter before Snapshot persist and warn on Refresh.
 */
export type WmwCashflowTransactionType =
  | (typeof WMW_CASHFLOW_TRANSACTION_TYPES)[number]
  | (string & {});

/** Alias so MWR and Net Worth call sites share one vocabulary. */
export type WmwCashflowType = WmwCashflowTransactionType;

/** Category allow-list for Investable Accounts (MWR). */
export const WMW_INVESTABLE_CATEGORY_IDS = [
  'CAT_BROKERAGE',
  'CAT_PENSION',
  'CAT_CRYPTO',
] as const;

export type WmwInvestableCategoryId =
  (typeof WMW_INVESTABLE_CATEGORY_IDS)[number];

export const WMW_SUPPORTED_CURRENCY = 'GBP' as const;

export type WmwAccount = {
  accountId: string;
  accountName: string;
  platform: string;
  categoryId: string;
  /** v1 is GBP-only; ingest excludes non-GBP Accounts. */
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

export type WmwCashflow = {
  /** Calendar date YYYY-MM-DD. */
  date: string;
  accountId: string;
  /** Account-perspective: into Account positive, out negative. */
  amount: number;
  transactionType: WmwCashflowTransactionType;
  description: string;
};

export type WmwRefreshWarningCode =
  | 'unknown_transaction_type'
  | 'non_gbp_account'
  | 'invalid_row'
  | 'orphan_fact';

export type WmwRefreshWarning = {
  code: WmwRefreshWarningCode;
  message: string;
  tab?: WmwWorkbookTab;
  row?: number;
  details?: Record<string, unknown>;
};

/**
 * Point-in-time Workbook copy for the lab (private storage, not Site Content).
 * Ingest retains Refresh warnings on last-good; calc fixtures use [].
 */
export type WmwSnapshot = {
  /** ISO timestamp when the Snapshot was taken (as-of). */
  asOf: string;
  accounts: WmwAccount[];
  categories: WmwCategory[];
  balances: WmwBalance[];
  cashflows: WmwCashflow[];
  warnings: WmwRefreshWarning[];
};

/** Unformatted Sheets matrices (header row + data rows). */
export type WmwWorkbookRaw = Record<WmwWorkbookTab, unknown[][]>;

/** Calendar month key YYYY-MM. */
export type CalendarMonth = string;
