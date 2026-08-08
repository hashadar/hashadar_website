/**
 * WMW (What's My Worth) — Workbook ingest + Snapshot facade.
 * Net Worth (#184) and MWR (#185) should import types/Snapshot from here,
 * not own parse modules.
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
  type WmwAccount,
  type WmwBalance,
  type WmwCashflow,
  type WmwCashflowTransactionType,
  type WmwCategory,
  type WmwInvestableCategoryId,
  type WmwRefreshWarning,
  type WmwRefreshWarningCode,
  type WmwSnapshot,
  type WmwWorkbookRaw,
  type WmwWorkbookTab,
} from '@/lib/wmw/types';
