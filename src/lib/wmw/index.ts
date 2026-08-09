/**
 * WMW (What's My Worth) — Workbook ingest, Snapshot facade, and pure calcs.
 * Shared Snapshot types live in `@/lib/wmw/types` (aligned with #182–#185).
 */

export {
  createWmw,
  type CreateWmwOptions,
  type WmwFacade,
  type WmwRefreshResult,
} from '@/lib/wmw/facade';

export {
  parseWorkbook,
  type ParseWorkbookInput,
  type ParseWorkbookResult,
} from '@/lib/wmw/parse-workbook';

export {
  cellToIsoDate,
  sheetsSerialToIsoDate,
} from '@/lib/wmw/sheets-serial-date';

export {
  createFixtureWorkbookSource,
  createGoogleSheetsWorkbookSource,
  mapBatchGetToRaw,
  type CreateGoogleSheetsWorkbookSourceOptions,
  type SheetsAccessTokenProvider,
  type SheetsValuesBatchGetResponse,
  type WmwWorkbookSource,
} from '@/lib/wmw/workbook-source';

export {
  createDefaultWmwSnapshotStore,
  createMemoryWmwSnapshotStore,
  createSnapshotStoreFromJsonStorage,
  type WmwSnapshotStore,
} from '@/lib/wmw/snapshot-store';

export {
  createDefaultWmwSnapshotStorage,
  createMemoryWmwSnapshotStorage,
  createWmwSnapshotStorage,
  type WmwLastGoodSnapshot,
  type WmwSnapshotStorage,
} from '@/lib/wmw/snapshot-storage';

export {
  getWmwConfig,
  WMW_GOOGLE_SA_SECRET_NAME_ENV,
  WMW_GOOGLE_SA_SECRET_NAME_PLACEHOLDER,
  WMW_SPREADSHEET_ID_ENV,
  WMW_WORKBOOK_NOT_CONFIGURED_REASON,
  type WmwConfig,
} from '@/lib/wmw/config';

export {
  WMW_LAST_GOOD_META_KEY,
  WMW_LAST_GOOD_SNAPSHOT_KEY,
  WMW_SNAPSHOTS_BUCKET,
  type WmwSnapshotMeta,
} from '@/lib/wmw/paths';

export {
  WMW_SNAPSHOT_CACHE_TTL_MS,
  createMemoryWmwSnapshotCache,
  type CreateMemoryWmwSnapshotCacheOptions,
  type WmwSnapshotCache,
} from '@/lib/wmw/cache';

export {
  createSampleWorkbookRaw,
  createWorkbookMissingBalanceColumn,
  SERIAL_2024_01_15,
  SERIAL_2024_02_01,
  SERIAL_2024_03_01,
  SERIAL_2024_06_15,
} from '@/lib/wmw/fixtures/sample-workbook';

export {
  WMW_ACCOUNT_COLUMNS,
  WMW_BALANCE_COLUMNS,
  WMW_CASHFLOW_COLUMNS,
  WMW_CASHFLOW_TRANSACTION_TYPES,
  WMW_CATEGORY_COLUMNS,
  WMW_INVESTABLE_CATEGORY_IDS,
  WMW_SUPPORTED_CURRENCY,
  WMW_WORKBOOK_TABS,
  type CalendarMonth,
  type WmwAccount,
  type WmwBalance,
  type WmwCashflow,
  type WmwCashflowTransactionType,
  type WmwCashflowType,
  type WmwCategory,
  type WmwInvestableCategoryId,
  type WmwRefreshWarning,
  type WmwRefreshWarningCode,
  type WmwSnapshot,
  type WmwWorkbookRaw,
  type WmwWorkbookTab,
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
  INVESTABLE_CATEGORY_IDS,
  computeAccountAnnualisedMwr,
  computeInvestableAccountsAnnualisedMwr,
  isInvestableAccount,
  isInvestableCategoryId,
  type AccountAnnualisedMwr,
  type InvestableCategoryId,
  type MwrPeriod,
  type MwrUnavailableReason,
} from '@/lib/wmw/mwr';

export {
  buildWmwOverviewView,
  type BuildWmwOverviewViewOptions,
  type WmwClassHistoryPoint,
  type WmwDashboardAccountRow,
  type WmwDashboardClassRow,
  type WmwOverviewKpis,
  type WmwOverviewView,
} from '@/lib/wmw/overview-view';

export {
  buildWmwAccountDetailView,
  type WmwAccountBalancePoint,
  type WmwAccountDetailView,
  type WmwAccountQuantityPoint,
} from '@/lib/wmw/account-detail-view';

export {
  formatAnnualisedRate,
  formatAsOf,
  formatCalendarMonth,
  formatGbp,
  formatIsoDate,
  formatMileage,
  formatQuantity,
} from '@/lib/wmw/format';

export {
  SAMPLE_ACCOUNTS,
  SAMPLE_BALANCES,
  SAMPLE_CATEGORIES,
  buildSampleSnapshot,
} from '@/lib/wmw/fixtures/sample-snapshot';
