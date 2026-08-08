/**
 * Normalise unformatted Workbook tab matrices into Snapshot records.
 * Never talks to Sheets or storage — pure parse seam for Vitest fixtures.
 */

import { cellToIsoDate } from '@/lib/wmw/sheets-serial-date';
import {
  WMW_ACCOUNT_COLUMNS,
  WMW_BALANCE_COLUMNS,
  WMW_CASHFLOW_COLUMNS,
  WMW_CASHFLOW_TRANSACTION_TYPES,
  WMW_CATEGORY_COLUMNS,
  WMW_SUPPORTED_CURRENCY,
  type WmwAccount,
  type WmwBalance,
  type WmwCashflow,
  type WmwCashflowTransactionType,
  type WmwCategory,
  type WmwRefreshWarning,
  type WmwSnapshot,
  type WmwWorkbookRaw,
  type WmwWorkbookTab,
} from '@/lib/wmw/types';

export type ParseWorkbookInput = {
  raw: WmwWorkbookRaw;
  /** ISO datetime for Snapshot.asOf (usually Refresh time). */
  asOf: string;
};

export type ParseWorkbookResult = WmwSnapshot;

type ColumnMap = Map<string, number>;

function isCashflowTransactionType(
  value: string,
): value is WmwCashflowTransactionType {
  return (WMW_CASHFLOW_TRANSACTION_TYPES as readonly string[]).includes(value);
}

function requireHeaderMap(
  rows: unknown[][],
  expected: readonly string[],
  tab: WmwWorkbookTab,
): ColumnMap {
  if (!rows.length) {
    throw new Error(`${tab}: missing header row`);
  }
  const header = rows[0].map((cell) => String(cell ?? '').trim());
  const map: ColumnMap = new Map();
  for (const name of expected) {
    const index = header.indexOf(name);
    if (index === -1) {
      throw new Error(`${tab}: missing required column "${name}"`);
    }
    map.set(name, index);
  }
  return map;
}

function cellAt(row: unknown[], map: ColumnMap, column: string): unknown {
  const index = map.get(column);
  if (index === undefined) return undefined;
  return row[index];
}

function asTrimmedString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function asOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  return asNumber(value);
}

function rowIsEmpty(row: unknown[]): boolean {
  return row.every(
    (cell) => cell === null || cell === undefined || String(cell).trim() === '',
  );
}

function parseCategories(
  rows: unknown[][],
  warnings: WmwRefreshWarning[],
): WmwCategory[] {
  const map = requireHeaderMap(rows, WMW_CATEGORY_COLUMNS, 'dim_Categories');
  const categories: WmwCategory[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (rowIsEmpty(row)) continue;

    const categoryId = asTrimmedString(cellAt(row, map, 'Category_ID'));
    const type = asTrimmedString(cellAt(row, map, 'Type'));
    const className = asTrimmedString(cellAt(row, map, 'Class'));
    const sign = asNumber(cellAt(row, map, 'Sign'));

    if (!categoryId || !type || !className || sign === null) {
      warnings.push({
        code: 'invalid_row',
        message: 'Skipped Category row with missing required fields.',
        tab: 'dim_Categories',
        row: i + 1,
      });
      continue;
    }

    categories.push({
      categoryId,
      type,
      class: className,
      sign,
    });
  }

  return categories;
}

function parseAccounts(
  rows: unknown[][],
  warnings: WmwRefreshWarning[],
): WmwAccount[] {
  const map = requireHeaderMap(rows, WMW_ACCOUNT_COLUMNS, 'dim_Accounts');
  const accounts: WmwAccount[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (rowIsEmpty(row)) continue;

    const accountId = asTrimmedString(cellAt(row, map, 'Account_ID'));
    const accountName = asTrimmedString(cellAt(row, map, 'Account_Name'));
    const platform = asTrimmedString(cellAt(row, map, 'Platform'));
    const categoryId = asTrimmedString(cellAt(row, map, 'Category_ID'));
    const currency = asTrimmedString(cellAt(row, map, 'Currency'));
    const pairRaw = asTrimmedString(cellAt(row, map, 'Pair_ID'));

    if (!accountId || !accountName || !categoryId || !currency) {
      warnings.push({
        code: 'invalid_row',
        message: 'Skipped Account row with missing required fields.',
        tab: 'dim_Accounts',
        row: i + 1,
        details: { accountId: accountId || undefined },
      });
      continue;
    }

    if (currency !== WMW_SUPPORTED_CURRENCY) {
      warnings.push({
        code: 'non_gbp_account',
        message: `Excluded Account ${accountId}: v1 is GBP-only (found ${currency}).`,
        tab: 'dim_Accounts',
        row: i + 1,
        details: { accountId, currency },
      });
      continue;
    }

    accounts.push({
      accountId,
      accountName,
      platform,
      categoryId,
      currency: WMW_SUPPORTED_CURRENCY,
      pairId: pairRaw === '' ? null : pairRaw,
    });
  }

  return accounts;
}

function parseBalances(
  rows: unknown[][],
  accountIds: ReadonlySet<string>,
  warnings: WmwRefreshWarning[],
): WmwBalance[] {
  const map = requireHeaderMap(rows, WMW_BALANCE_COLUMNS, 'fact_Balances');
  const balances: WmwBalance[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (rowIsEmpty(row)) continue;

    const date = cellToIsoDate(cellAt(row, map, 'Date'));
    const accountId = asTrimmedString(cellAt(row, map, 'Account_ID'));
    const balance = asNumber(cellAt(row, map, 'Balance'));
    const units = asOptionalNumber(cellAt(row, map, 'Units'));
    const mileage = asOptionalNumber(cellAt(row, map, 'Mileage'));

    if (!date || !accountId || balance === null) {
      warnings.push({
        code: 'invalid_row',
        message: 'Skipped Balance row with missing required fields.',
        tab: 'fact_Balances',
        row: i + 1,
        details: { accountId: accountId || undefined },
      });
      continue;
    }

    if (!accountIds.has(accountId)) {
      warnings.push({
        code: 'orphan_fact',
        message: `Excluded Balance for unknown or non-GBP Account ${accountId}.`,
        tab: 'fact_Balances',
        row: i + 1,
        details: { accountId, date },
      });
      continue;
    }

    balances.push({ date, accountId, balance, units, mileage });
  }

  return balances;
}

function parseCashflows(
  rows: unknown[][],
  accountIds: ReadonlySet<string>,
  warnings: WmwRefreshWarning[],
): WmwCashflow[] {
  const map = requireHeaderMap(rows, WMW_CASHFLOW_COLUMNS, 'fact_Cashflows');
  const cashflows: WmwCashflow[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (rowIsEmpty(row)) continue;

    const date = cellToIsoDate(cellAt(row, map, 'Date'));
    const accountId = asTrimmedString(cellAt(row, map, 'Account_ID'));
    const amount = asNumber(cellAt(row, map, 'Amount'));
    const transactionType = asTrimmedString(
      cellAt(row, map, 'Transaction_Type'),
    );
    const description = asTrimmedString(cellAt(row, map, 'Description'));

    if (!date || !accountId || amount === null || !transactionType) {
      warnings.push({
        code: 'invalid_row',
        message: 'Skipped Cashflow row with missing required fields.',
        tab: 'fact_Cashflows',
        row: i + 1,
        details: { accountId: accountId || undefined },
      });
      continue;
    }

    if (!accountIds.has(accountId)) {
      warnings.push({
        code: 'orphan_fact',
        message: `Excluded Cashflow for unknown or non-GBP Account ${accountId}.`,
        tab: 'fact_Cashflows',
        row: i + 1,
        details: { accountId, date },
      });
      continue;
    }

    if (!isCashflowTransactionType(transactionType)) {
      warnings.push({
        code: 'unknown_transaction_type',
        message: `Excluded Cashflow with unknown Transaction_Type "${transactionType}" from MWR inputs.`,
        tab: 'fact_Cashflows',
        row: i + 1,
        details: { accountId, date, transactionType, amount },
      });
      continue;
    }

    cashflows.push({
      date,
      accountId,
      amount,
      transactionType,
      description,
    });
  }

  return cashflows;
}

/** Parse and normalise four frozen Workbook tabs into a Snapshot payload. */
export function parseWorkbook(input: ParseWorkbookInput): ParseWorkbookResult {
  const warnings: WmwRefreshWarning[] = [];

  const categories = parseCategories(input.raw.dim_Categories, warnings);
  const accounts = parseAccounts(input.raw.dim_Accounts, warnings);
  const accountIds = new Set(accounts.map((a) => a.accountId));
  const balances = parseBalances(input.raw.fact_Balances, accountIds, warnings);
  const cashflows = parseCashflows(
    input.raw.fact_Cashflows,
    accountIds,
    warnings,
  );

  return {
    asOf: input.asOf,
    accounts,
    categories,
    balances,
    cashflows,
    warnings,
  };
}
