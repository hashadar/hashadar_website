/**
 * WMW Snapshot and Workbook contract types (ADR 0009 / epic #179).
 * Shared with Net Worth (#184) and MWR (#185) — keep shape stable.
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

export const WMW_CASHFLOW_TRANSACTION_TYPES = [
  'Contribution',
  'Withdrawal',
  'Loan Repayment',
] as const;

export type WmwCashflowTransactionType =
  (typeof WMW_CASHFLOW_TRANSACTION_TYPES)[number];

/** Category allow-list for Investable Accounts (MWR); stored for downstream use. */
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
  currency: typeof WMW_SUPPORTED_CURRENCY;
  /** Empty Workbook Pair_ID becomes null (unpaired). */
  pairId: string | null;
};

export type WmwCategory = {
  categoryId: string;
  type: string;
  class: string;
  sign: number;
};

export type WmwBalance = {
  /** Calendar date YYYY-MM-DD (from Sheets serial). */
  date: string;
  accountId: string;
  balance: number;
  units: number | null;
  mileage: number | null;
};

export type WmwCashflow = {
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
 * `cashflows` holds only v1 Transaction_Types; unknowns are omitted + warned on Refresh.
 */
export type WmwSnapshot = {
  /** ISO datetime of the Snapshot as-of. */
  asOf: string;
  accounts: WmwAccount[];
  categories: WmwCategory[];
  balances: WmwBalance[];
  cashflows: WmwCashflow[];
  /** Refresh-time warnings retained with last-good copy for UI surfacing. */
  warnings: WmwRefreshWarning[];
};

/** Unformatted Sheets matrices (header row + data rows). */
export type WmwWorkbookRaw = Record<WmwWorkbookTab, unknown[][]>;
