/**
 * Pure Overview view-model from a Snapshot (injectable; no Sheets / Amplify).
 */

import { computeNetWorth } from '@/lib/wmw/net-worth';
import { computePairEquity } from '@/lib/wmw/paired-accounts';
import type { PairEquity } from '@/lib/wmw/paired-accounts';
import {
  buildPositionDefs,
  classRowsFromPositions,
  computePositions,
  type WmwPosition,
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

/** Net combines Paired Accounts into one position; Gross lists each Account. */
export type WmwOverviewBasis = 'net' | 'gross';

export type WmwDashboardAccountRow = AccountNetWorthRow & {
  pctOfNetWorth: number | null;
  momDelta: number | null;
  /** Set on a net-basis row that combines Paired Accounts. */
  netPosition: {
    pairId: string | null;
    accountIds: string[];
    negativeEquity: boolean;
  } | null;
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
  basis: WmwOverviewBasis;
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
  /** Defaults to net. */
  basis?: WmwOverviewBasis;
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
  rows: ClassNetWorthRow[],
  priorRows: ClassNetWorthRow[] | null,
  total: number,
): WmwDashboardClassRow[] {
  const priorByClass = new Map(
    (priorRows ?? []).map((row) => [row.class, row.contribution]),
  );
  return [...rows]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .map((row) => ({
      ...row,
      pctOfNetWorth: pctOf(row.contribution, total),
      momDelta: priorRows
        ? row.contribution - (priorByClass.get(row.class) ?? 0)
        : null,
    }));
}

function finishAccountRows(
  rows: Array<{
    row: AccountNetWorthRow;
    netPosition: WmwDashboardAccountRow['netPosition'];
    searchText: string;
  }>,
  priorContribution: Map<string, number>,
  hasPrior: boolean,
  total: number,
  accountQuery: string,
): WmwDashboardAccountRow[] {
  const query = accountQuery.trim().toLowerCase();
  return rows
    .filter(({ searchText }) => !query || searchText.includes(query))
    .sort(
      (a, b) =>
        Math.abs(b.row.contribution) - Math.abs(a.row.contribution),
    )
    .map(({ row, netPosition }) => ({
      ...row,
      pctOfNetWorth: pctOf(row.contribution, total),
      momDelta: hasPrior
        ? row.contribution - (priorContribution.get(row.accountId) ?? 0)
        : null,
      netPosition,
    }));
}

function enrichGrossAccountRows(
  display: NetWorthMonth,
  prior: NetWorthMonth | null,
  accountQuery: string,
): WmwDashboardAccountRow[] {
  return finishAccountRows(
    display.byAccount.map((row) => ({
      row,
      netPosition: null,
      searchText: [row.accountName, row.accountId, row.class]
        .join('\n')
        .toLowerCase(),
    })),
    new Map((prior?.byAccount ?? []).map((r) => [r.accountId, r.contribution])),
    prior !== null,
    display.total,
    accountQuery,
  );
}

function positionRow(position: WmwPosition): AccountNetWorthRow {
  if (!position.isNet) {
    const leg = position.legs[0]!;
    return {
      accountId: leg.accountId,
      accountName: leg.accountName,
      categoryId: leg.categoryId,
      class: leg.class,
      balance: leg.balance,
      sign: leg.sign,
      contribution: leg.contribution,
    };
  }
  return {
    accountId: position.primaryAccountId,
    accountName: position.name,
    categoryId: position.categoryId,
    class: position.class,
    balance: position.contribution,
    sign: 1,
    contribution: position.contribution,
  };
}

/** Rows keyed by the position's primary Account ID so MoM matches month to month. */
function enrichNetAccountRows(
  positions: WmwPosition[],
  priorPositions: WmwPosition[] | null,
  total: number,
  accountQuery: string,
): WmwDashboardAccountRow[] {
  return finishAccountRows(
    positions.map((position) => ({
      row: positionRow(position),
      netPosition: position.isNet
        ? {
            pairId: position.pairId,
            accountIds: position.accountIds,
            negativeEquity: position.negativeEquity,
          }
        : null,
      searchText: [
        position.legs.map((leg) => leg.accountName),
        position.accountIds,
        position.class,
        position.pairId ?? '',
      ]
        .flat()
        .join('\n')
        .toLowerCase(),
    })),
    new Map(
      (priorPositions ?? []).map((p) => [p.primaryAccountId, p.contribution]),
    ),
    priorPositions !== null,
    total,
    accountQuery,
  );
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
  const pairs = computePairEquity(snapshot, displayMonth?.month);
  const defs = basis === 'net' ? buildPositionDefs(snapshot) : [];
  const accountQuery = options.accountQuery ?? '';

  let classRows: WmwDashboardClassRow[] = [];
  let accountRows: WmwDashboardAccountRow[] = [];
  let classHistory: WmwClassHistoryPoint[];

  if (basis === 'net') {
    classHistory = netWorth.months.map((m) => ({
      month: m.month,
      byClass: classRowsFromPositions(computePositions(defs, m)),
    }));
    if (displayMonth) {
      const positions = computePositions(defs, displayMonth);
      const priorPositions = prior ? computePositions(defs, prior) : null;
      classRows = enrichClassRows(
        classRowsFromPositions(positions),
        priorPositions ? classRowsFromPositions(priorPositions) : null,
        displayMonth.total,
      );
      accountRows = enrichNetAccountRows(
        positions,
        priorPositions,
        displayMonth.total,
        accountQuery,
      );
    }
  } else {
    classHistory = netWorth.months.map((m) => ({
      month: m.month,
      byClass: m.byClass,
    }));
    if (displayMonth) {
      classRows = enrichClassRows(
        displayMonth.byClass,
        prior ? prior.byClass : null,
        displayMonth.total,
      );
      accountRows = enrichGrossAccountRows(displayMonth, prior, accountQuery);
    }
  }

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
    classHistory,
    months: netWorth.months.map((m) => m.month),
    basis,
    kpis: displayMonth ? buildKpis(displayMonth, prior) : null,
    classRows,
    accountRows,
    pairs,
    accountNames,
  };
}
