/**
 * Pure Overview view-model from a Snapshot (injectable; no Sheets / Amplify).
 */

import { computeNetWorth } from '@/lib/wmw/net-worth';
import { computePairEquity } from '@/lib/wmw/paired-accounts';
import type { PairEquity } from '@/lib/wmw/paired-accounts';
import {
  groupMonthIntoPositions,
  isCombinedPosition,
  positionClassRows,
  type WmwPositionLeg,
} from '@/lib/wmw/positions';
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

/** Net groups Paired Accounts into one position; Gross lists every Account. */
export type WmwOverviewBasis = 'net' | 'gross';

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
  /** Legs behind a combined Net position; empty for single Accounts. */
  pairLegs: WmwPositionLeg[];
};

export type WmwClassHistoryPoint = {
  month: CalendarMonth;
  byClass: ClassNetWorthRow[];
};

export type WmwOverviewView = {
  asOf: string;
  warnings: WmwSnapshot['warnings'];
  basis: WmwOverviewBasis;
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
  /** Case-insensitive Account name / id filter (any leg of a Net position). */
  accountQuery?: string;
  /** Defaults to `net`. KPIs and totals are identical in both bases. */
  basis?: WmwOverviewBasis;
};

type BasisRow = AccountNetWorthRow & { pairLegs: WmwPositionLeg[] };

type BasisMonth = {
  rows: BasisRow[];
  classes: ClassNetWorthRow[];
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

/** Rows and Class totals for a month on the chosen basis. */
function basisMonth(
  snapshot: WmwSnapshot,
  month: NetWorthMonth,
  basis: WmwOverviewBasis,
): BasisMonth {
  if (basis === 'gross') {
    return {
      rows: month.byAccount.map((row) => ({ ...row, pairLegs: [] })),
      classes: month.byClass,
    };
  }
  const positions = groupMonthIntoPositions(snapshot, month);
  return {
    rows: positions.map((position) => ({
      accountId: position.accountId,
      accountName: position.accountName,
      categoryId: position.categoryId,
      class: position.class,
      balance: position.balance,
      sign: position.sign,
      contribution: position.contribution,
      pairLegs: isCombinedPosition(position) ? position.legs : [],
    })),
    classes: positionClassRows(positions),
  };
}

function enrichClassRows(
  display: BasisMonth,
  total: number,
  prior: BasisMonth | null,
): WmwDashboardClassRow[] {
  const priorByClass = new Map(
    (prior?.classes ?? []).map((row) => [row.class, row.contribution]),
  );
  return [...display.classes]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .map((row) => ({
      ...row,
      pctOfNetWorth: pctOf(row.contribution, total),
      momDelta: prior
        ? row.contribution - (priorByClass.get(row.class) ?? 0)
        : null,
    }));
}

function matchesQuery(row: BasisRow, query: string): boolean {
  const names = [row, ...row.pairLegs];
  return (
    names.some(
      (item) =>
        item.accountName.toLowerCase().includes(query) ||
        item.accountId.toLowerCase().includes(query),
    ) || row.class.toLowerCase().includes(query)
  );
}

function enrichAccountRows(
  display: BasisMonth,
  total: number,
  prior: BasisMonth | null,
  accountQuery: string,
): WmwDashboardAccountRow[] {
  const priorByAccount = new Map(
    (prior?.rows ?? []).map((row) => [row.accountId, row.contribution]),
  );
  const query = accountQuery.trim().toLowerCase();
  return display.rows
    .filter((row) => !query || matchesQuery(row, query))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .map((row) => ({
      ...row,
      pctOfNetWorth: pctOf(row.contribution, total),
      momDelta: prior
        ? row.contribution - (priorByAccount.get(row.accountId) ?? 0)
        : null,
    }));
}

export function buildWmwOverviewView(
  snapshot: WmwSnapshot,
  options: BuildWmwOverviewViewOptions = {},
): WmwOverviewView {
  const basis = options.basis ?? 'net';
  const netWorth = computeNetWorth(snapshot);
  const accountNames = new Map(
    snapshot.accounts.map((a) => [a.accountId, a.accountName]),
  );
  const displayMonth = resolveDisplayMonth(netWorth, options.selectedMonth);
  const prior = displayMonth
    ? previousMonth(netWorth.months, displayMonth.month)
    : null;
  const pairs = computePairEquity(snapshot, displayMonth?.month, netWorth);

  const displayBasis = displayMonth
    ? basisMonth(snapshot, displayMonth, basis)
    : null;
  const priorBasis = prior ? basisMonth(snapshot, prior, basis) : null;
  const classRows =
    displayMonth && displayBasis
      ? enrichClassRows(displayBasis, displayMonth.total, priorBasis)
      : [];
  const accountRows =
    displayMonth && displayBasis
      ? enrichAccountRows(
          displayBasis,
          displayMonth.total,
          priorBasis,
          options.accountQuery ?? '',
        )
      : [];

  return {
    asOf: snapshot.asOf,
    warnings: snapshot.warnings,
    basis,
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
      byClass: basisMonth(snapshot, m, basis).classes,
    })),
    months: netWorth.months.map((m) => m.month),
    kpis: displayMonth ? buildKpis(displayMonth, prior) : null,
    classRows,
    accountRows,
    pairs,
    accountNames,
  };
}
