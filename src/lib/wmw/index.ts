/**
 * WMW pure calculation modules (Net Worth + Paired Accounts).
 * Snapshot types live here for shared use by ingest (#183) and MWR (#185).
 */

export type {
  CalendarMonth,
  WmwAccount,
  WmwBalance,
  WmwCashflow,
  WmwCashflowTransactionType,
  WmwCategory,
  WmwSnapshot,
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
