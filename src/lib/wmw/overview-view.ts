/**
 * Pure Overview view-model from a Snapshot (injectable; no Sheets / Amplify).
 */

import { computeNetWorth } from '@/lib/wmw/net-worth';
import { computePairEquity } from '@/lib/wmw/paired-accounts';
import type { PairEquity } from '@/lib/wmw/paired-accounts';
import type {
  AccountNetWorthRow,
  ClassNetWorthRow,
  NetWorthMonth,
  NetWorthResult,
} from '@/lib/wmw/net-worth';
import type { CalendarMonth, WmwSnapshot } from '@/lib/wmw/types';

export const WMW_BROKERAGE_CATEGORY_ID = 'CAT_BROKERAGE';
export const WMW_CASH_CATEGORY_ID = 'CAT_CASH';
export const WMW_PENSION_CATEGORY_ID = 'CAT_PENSION';

export type WmwKpiMetric = {
  total: number;
  momDelta: number | null;
  momPct: number | null;
};

export type WmwOverviewKpis = {
  month: CalendarMonth;
  netWorth: WmwKpiMetric;
  cashSavings: WmwKpiMetric;
  generalInvestments: WmwKpiMetric;
  retirement: WmwKpiMetric;
};

export type WmwDashboardClassRow = ClassNetWorthRow & {
  pctOfNetWorth: number | null;
  momDelta: number | null;
};

export type WmwDashboardAccountRow = AccountNetWorthRow & {
  pctOfNetWorth: number | null;
  momDelta: number | null;
};

export type WmwClassHistoryPoint = {
  month: CalendarMonth;
  byClass: ClassNetWorthRow[];
};

export type WmwOverviewView = {
  asOf: string;
  warnings: WmwSnapshot['warnings'];
  netWorth: NetWorthResult;
  headline: NetWorthMonth | null;
  /** Month driving Class / Account / pair tables (slicer). */
  selectedMonth: CalendarMonth | null;
  displayMonth: NetWorthMonth | null;
  history: Array<{ month: string; total: number }>;
  classHistory: WmwClassHistoryPoint[];
  months: CalendarMonth[];
  kpis: WmwOverviewKpis | null;
  classRows: WmwDashboardClassRow[];
  accountRows: WmwDashboardAccountRow[];
  pairs: PairEquity[];
  accountNames: Map<string, string>;
};

export type BuildWmwOverviewViewOptions = {
  /** Defaults to headline month when omitted / unknown. */
  selectedMonth?: CalendarMonth | null;
  /** Case-insensitive Account name / id filter. */
  accountQuery?: string;
};

function pctOf(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return part / whole;
}

function previousMonth(
  months: NetWorthMonth[],
  month: CalendarMonth,
): NetWorthMonth | null {
  const index = months.findIndex((m) => m.month === month);
  if (index <= 0) return null;
  return months[index - 1] ?? null;
}

function resolveDisplayMonth(
  netWorth: NetWorthResult,
  selectedMonth: CalendarMonth | null | undefined,
): NetWorthMonth | null {
  if (!netWorth.months.length) return null;
  if (selectedMonth) {
    const match = netWorth.months.find((m) => m.month === selectedMonth);
    if (match) return match;
  }
  return netWorth.headline;
}

function sumCategoryContribution(
  month: NetWorthMonth,
  categoryId: string,
): number {
  let total = 0;
  for (const row of month.byAccount) {
    if (row.categoryId === categoryId) {
      total += row.contribution;
    }
  }
  return total;
}

function buildMetric(
  current: number,
  priorTotal: number | null,
): WmwKpiMetric {
  if (priorTotal === null) {
    return { total: current, momDelta: null, momPct: null };
  }
  const momDelta = current - priorTotal;
  const momPct = priorTotal === 0 ? null : momDelta / priorTotal;
  return { total: current, momDelta, momPct };
}

function buildKpis(
  display: NetWorthMonth,
  prior: NetWorthMonth | null,
): WmwOverviewKpis {
  return {
    month: display.month,
    netWorth: buildMetric(display.total, prior ? prior.total : null),
    cashSavings: buildMetric(
      sumCategoryContribution(display, WMW_CASH_CATEGORY_ID),
      prior ? sumCategoryContribution(prior, WMW_CASH_CATEGORY_ID) : null,
    ),
    generalInvestments: buildMetric(
      sumCategoryContribution(display, WMW_BROKERAGE_CATEGORY_ID),
      prior ? sumCategoryContribution(prior, WMW_BROKERAGE_CATEGORY_ID) : null,
    ),
    retirement: buildMetric(
      sumCategoryContribution(display, WMW_PENSION_CATEGORY_ID),
      prior ? sumCategoryContribution(prior, WMW_PENSION_CATEGORY_ID) : null,
    ),
  };
}

function enrichClassRows(
  display: NetWorthMonth,
  prior: NetWorthMonth | null,
): WmwDashboardClassRow[] {
  const priorByClass = new Map(
    (prior?.byClass ?? []).map((row) => [row.class, row.contribution]),
  );
  return [...display.byClass]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .map((row) => ({
      ...row,
      pctOfNetWorth: pctOf(row.contribution, display.total),
      momDelta: prior
        ? row.contribution - (priorByClass.get(row.class) ?? 0)
        : null,
    }));
}

function enrichAccountRows(
  display: NetWorthMonth,
  prior: NetWorthMonth | null,
  accountQuery: string,
): WmwDashboardAccountRow[] {
  const priorByAccount = new Map(
    (prior?.byAccount ?? []).map((row) => [row.accountId, row.contribution]),
  );
  const query = accountQuery.trim().toLowerCase();
  return [...display.byAccount]
    .filter((row) => {
      if (!query) return true;
      return (
        row.accountName.toLowerCase().includes(query) ||
        row.accountId.toLowerCase().includes(query) ||
        row.class.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .map((row) => ({
      ...row,
      pctOfNetWorth: pctOf(row.contribution, display.total),
      momDelta: prior
        ? row.contribution - (priorByAccount.get(row.accountId) ?? 0)
        : null,
    }));
}

export function buildWmwOverviewView(
  snapshot: WmwSnapshot,
  options: BuildWmwOverviewViewOptions = {},
): WmwOverviewView {
  const netWorth = computeNetWorth(snapshot);
  const accountNames = new Map(
    snapshot.accounts.map((a) => [a.accountId, a.accountName]),
  );
  const displayMonth = resolveDisplayMonth(netWorth, options.selectedMonth);
  const prior = displayMonth
    ? previousMonth(netWorth.months, displayMonth.month)
    : null;
  const pairs = computePairEquity(snapshot, displayMonth?.month);
  const classRows = displayMonth
    ? enrichClassRows(displayMonth, prior)
    : [];
  const accountRows = displayMonth
    ? enrichAccountRows(displayMonth, prior, options.accountQuery ?? '')
    : [];

  return {
    asOf: snapshot.asOf,
    warnings: snapshot.warnings,
    netWorth,
    headline: netWorth.headline,
    selectedMonth: displayMonth?.month ?? null,
    displayMonth,
    history: netWorth.months.map((m) => ({
      month: m.month,
      total: m.total,
    })),
    classHistory: netWorth.months.map((m) => ({
      month: m.month,
      byClass: m.byClass,
    })),
    months: netWorth.months.map((m) => m.month),
    kpis: displayMonth ? buildKpis(displayMonth, prior) : null,
    classRows,
    accountRows,
    pairs,
    accountNames,
  };
}
