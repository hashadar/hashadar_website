/**
 * WMW pure calculation modules (Net Worth + Paired Accounts).
 * Snapshot types are shared with storage (#182), ingest (#183), and MWR (#185).
 */

export {
  WMW_ACCOUNT_COLUMNS,
  WMW_BALANCE_COLUMNS,
  WMW_CASHFLOW_COLUMNS,
  WMW_CASHFLOW_TRANSACTION_TYPES,
  WMW_CATEGORY_COLUMNS,
  WMW_INVESTABLE_CATEGORY_IDS,
  WMW_SUPPORTED_CURRENCY,
  WMW_WORKBOOK_TABS,
} from '@/lib/wmw/types';

export type {
  CalendarMonth,
  WmwAccount,
  WmwBalance,
  WmwCashflow,
  WmwCashflowTransactionType,
  WmwCashflowType,
  WmwCategory,
  WmwInvestableCategoryId,
  WmwRefreshWarning,
  WmwRefreshWarningCode,
  WmwSnapshot,
  WmwWorkbookRaw,
  WmwWorkbookTab,
} from '@/lib/wmw/types';

export {
  calendarMonthFromDate,
  compareIsoKeys,
  isCalendarMonth,
} from '@/lib/wmw/calendar-month';

export {
  computeNetWorth,
  computeNetWorthForMonth,
  type AccountNetWorthRow,
  type ClassNetWorthRow,
  type NetWorthMonth,
  type NetWorthResult,
} from '@/lib/wmw/net-worth';

export {
  computePairEquity,
  type PairEquity,
  type PairLeg,
} from '@/lib/wmw/paired-accounts';

export {
  SAMPLE_ACCOUNTS,
  SAMPLE_BALANCES,
  SAMPLE_CATEGORIES,
  buildSampleSnapshot,
} from '@/lib/wmw/fixtures/sample-snapshot';
