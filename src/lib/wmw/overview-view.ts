/**
 * Pure Overview view-model from a Snapshot (injectable; no Sheets / Amplify).
 */

import { computeNetWorth } from '@/lib/wmw/net-worth';
import { computePairEquity } from '@/lib/wmw/paired-accounts';
import {
  computeInvestableAccountsAnnualisedMwr,
  type AccountAnnualisedMwr,
  type MwrPeriod,
} from '@/lib/wmw/mwr';
import type { PairEquity } from '@/lib/wmw/paired-accounts';
import type {
  AccountNetWorthRow,
  ClassNetWorthRow,
  NetWorthMonth,
  NetWorthResult,
} from '@/lib/wmw/net-worth';
import type { CalendarMonth, WmwSnapshot } from '@/lib/wmw/types';

/** Brokerage balances only — pensions / crypto stay out of the AUM KPI. */
export const WMW_BROKERAGE_CATEGORY_ID = 'CAT_BROKERAGE';
export const WMW_CASH_CATEGORY_ID = 'CAT_CASH';

export type WmwOverviewKpis = {
  month: CalendarMonth;
  netWorth: number;
  momDelta: number | null;
  momPct: number | null;
  /** Sum of CAT_BROKERAGE Account Balances for the selected month. */
  brokerageAum: number;
  /** Sum of CAT_CASH Account Balances for the selected month. */
  cashTotal: number;
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
  mwr: AccountAnnualisedMwr[];
  accountNames: Map<string, string>;
};

export type BuildWmwOverviewViewOptions = {
  period: MwrPeriod;
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

function buildKpis(
  display: NetWorthMonth,
  prior: NetWorthMonth | null,
): WmwOverviewKpis {
  const momDelta = prior ? display.total - prior.total : null;
  const momPct =
    prior && prior.total !== 0 ? (display.total - prior.total) / prior.total : null;

  let brokerageAum = 0;
  let cashTotal = 0;
  for (const row of display.byAccount) {
    if (row.categoryId === WMW_BROKERAGE_CATEGORY_ID) {
      brokerageAum += row.balance;
    }
    if (row.categoryId === WMW_CASH_CATEGORY_ID) {
      cashTotal += row.balance;
    }
  }

  return {
    month: display.month,
    netWorth: display.total,
    momDelta,
    momPct,
    brokerageAum,
    cashTotal,
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
  periodOrOptions: MwrPeriod | BuildWmwOverviewViewOptions,
  maybeSelectedMonth?: CalendarMonth | null,
): WmwOverviewView {
  const options: BuildWmwOverviewViewOptions =
    typeof periodOrOptions === 'string'
      ? { period: periodOrOptions, selectedMonth: maybeSelectedMonth }
      : periodOrOptions;

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
    mwr: computeInvestableAccountsAnnualisedMwr(snapshot, options.period),
    accountNames,
  };
}
