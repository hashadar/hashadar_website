/**
 * Monthly Net Worth from a Snapshot.
 * Missing Account that month ⇒ £0 (no carry-forward). Headline = latest month with Balances.
 */

import {
  calendarMonthFromDate,
  compareIsoKeys,
} from '@/lib/wmw/calendar-month';
import type {
  CalendarMonth,
  WmwAccount,
  WmwBalance,
  WmwCategory,
  WmwSnapshot,
} from '@/lib/wmw/types';

export type AccountNetWorthRow = {
  accountId: string;
  accountName: string;
  categoryId: string;
  class: string;
  balance: number;
  sign: number;
  /** Balance × Category Sign. */
  contribution: number;
};

export type ClassNetWorthRow = {
  class: string;
  contribution: number;
};

export type NetWorthMonth = {
  month: CalendarMonth;
  total: number;
  byAccount: AccountNetWorthRow[];
  byClass: ClassNetWorthRow[];
};

export type NetWorthResult = {
  /** Ascending by month. */
  months: NetWorthMonth[];
  /** Latest month that has any Balances; null when Snapshot has none. */
  headline: NetWorthMonth | null;
};

type CategoryLookup = Map<string, WmwCategory>;
type AccountLookup = Map<string, WmwAccount>;

function categoryLookup(categories: WmwCategory[]): CategoryLookup {
  return new Map(categories.map((c) => [c.categoryId, c]));
}

function accountLookup(accounts: WmwAccount[]): AccountLookup {
  return new Map(accounts.map((a) => [a.accountId, a]));
}

/** Latest in-month Balance per Account (by date, then last row wins). */
function latestBalancesByAccount(
  balances: WmwBalance[],
): Map<string, WmwBalance> {
  const sorted = [...balances].sort((a, b) => compareIsoKeys(a.date, b.date));
  const latest = new Map<string, WmwBalance>();
  for (const row of sorted) {
    latest.set(row.accountId, row);
  }
  return latest;
}

function buildMonth(
  month: CalendarMonth,
  monthBalances: WmwBalance[],
  accounts: AccountLookup,
  categories: CategoryLookup,
): NetWorthMonth {
  const latest = latestBalancesByAccount(monthBalances);
  const byAccount: AccountNetWorthRow[] = [];

  for (const [accountId, balanceRow] of latest) {
    const account = accounts.get(accountId);
    if (!account) continue;
    const category = categories.get(account.categoryId);
    if (!category) continue;

    const contribution = balanceRow.balance * category.sign;
    byAccount.push({
      accountId,
      accountName: account.accountName,
      categoryId: account.categoryId,
      class: category.class,
      balance: balanceRow.balance,
      sign: category.sign,
      contribution,
    });
  }

  byAccount.sort((a, b) => a.accountId.localeCompare(b.accountId));

  const classTotals = new Map<string, number>();
  for (const row of byAccount) {
    classTotals.set(
      row.class,
      (classTotals.get(row.class) ?? 0) + row.contribution,
    );
  }

  const byClass: ClassNetWorthRow[] = [...classTotals.entries()]
    .map(([className, contribution]) => ({
      class: className,
      contribution,
    }))
    .sort((a, b) => a.class.localeCompare(b.class));

  const total = byAccount.reduce((sum, row) => sum + row.contribution, 0);

  return { month, total, byAccount, byClass };
}

/**
 * Compute Net Worth for every calendar month that has at least one Balance.
 * Accounts with no Balance in a month contribute £0 (omitted from that month’s rows).
 */
export function computeNetWorth(snapshot: WmwSnapshot): NetWorthResult {
  const accounts = accountLookup(snapshot.accounts);
  const categories = categoryLookup(snapshot.categories);

  const byMonth = new Map<CalendarMonth, WmwBalance[]>();
  for (const balance of snapshot.balances) {
    const month = calendarMonthFromDate(balance.date);
    const list = byMonth.get(month);
    if (list) list.push(balance);
    else byMonth.set(month, [balance]);
  }

  const months = [...byMonth.keys()]
    .sort(compareIsoKeys)
    .map((month) =>
      buildMonth(month, byMonth.get(month)!, accounts, categories),
    );

  const headline = months.length > 0 ? months[months.length - 1]! : null;
  return { months, headline };
}

/** Net Worth for one calendar month; £0 total when the month has no Balances. */
export function computeNetWorthForMonth(
  snapshot: WmwSnapshot,
  month: CalendarMonth,
): NetWorthMonth {
  const result = computeNetWorth(snapshot);
  const found = result.months.find((m) => m.month === month);
  if (found) return found;
  return { month, total: 0, byAccount: [], byClass: [] };
}
