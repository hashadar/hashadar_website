/**
 * Pure Account detail view-model from a Snapshot (injectable; no Sheets / Amplify).
 */

import {
  computeAccountAnnualisedMwr,
  isInvestableCategoryId,
  type AccountAnnualisedMwr,
  type MwrPeriod,
} from '@/lib/wmw/mwr';
import type {
  WmwAccount,
  WmwCashflow,
  WmwCategory,
  WmwSnapshot,
} from '@/lib/wmw/types';

const MWR_PERIODS: MwrPeriod[] = ['YTD', '1Y', 'Max'];

export type WmwAccountBalancePoint = {
  date: string;
  balance: number;
};

export type WmwAccountReturnPoint = {
  date: string;
  /** Cumulative decimal return since first Balance (cashflow-adjusted). */
  cumulativeReturn: number;
};

export type WmwAccountQuantityPoint = {
  date: string;
  value: number;
};

export type WmwAccountCashflowSummary = {
  count: number;
  netAmount: number;
  contributionTotal: number;
  withdrawalTotal: number;
  firstDate: string | null;
  lastDate: string | null;
};

export type WmwAccountDetailView =
  | { status: 'not-found' }
  | {
      status: 'ready';
      asOf: string;
      account: WmwAccount;
      category: WmwCategory | null;
      /** Latest Balance row value, or null when none. */
      latestBalance: number | null;
      /** MoM £ change vs prior Balance point, or null. */
      balanceMomDelta: number | null;
      /** MoM % change vs prior Balance point, or null. */
      balanceMomPct: number | null;
      balanceHistory: WmwAccountBalancePoint[];
      /**
       * Cumulative return series for the Performance chart.
       * Only for investable Categories (brokerage / pension / crypto).
       */
      returnHistory: WmwAccountReturnPoint[];
      cashflowSummary: WmwAccountCashflowSummary;
      /** Present when any Balance row has Units. */
      unitsHistory: WmwAccountQuantityPoint[] | null;
      /**
   * Miles driven per calendar month (delta of cumulative Mileage readings).
   * First observed month is omitted — no prior reading to differ against.
   */
      mileageHistory: WmwAccountQuantityPoint[] | null;
      /** Brokerage / pension / crypto — MWR + Performance series apply. */
      investable: boolean;
      /** YTD / 1Y / Max when investable; otherwise empty. */
      mwr: AccountAnnualisedMwr[];
    };

function byDateAsc(a: { date: string }, b: { date: string }): number {
  return a.date.localeCompare(b.date);
}

function summariseCashflows(cashflows: WmwCashflow[]): WmwAccountCashflowSummary {
  let contributionTotal = 0;
  let withdrawalTotal = 0;
  let netAmount = 0;

  for (const cf of cashflows) {
    netAmount += cf.amount;
    if (cf.transactionType === 'Contribution') {
      contributionTotal += cf.amount;
    } else if (cf.transactionType === 'Withdrawal') {
      withdrawalTotal += Math.abs(cf.amount);
    }
  }

  return {
    count: cashflows.length,
    netAmount,
    contributionTotal,
    withdrawalTotal,
    firstDate: cashflows[0]?.date ?? null,
    lastDate: cashflows[cashflows.length - 1]?.date ?? null,
  };
}

/**
 * Chain simple period returns with end-dated Cashflows stripped from the gain,
 * so contributions do not look like performance.
 */
export function buildReturnHistory(
  balances: WmwAccountBalancePoint[],
  cashflows: WmwCashflow[],
): WmwAccountReturnPoint[] {
  if (balances.length === 0) {
    return [];
  }

  const first = balances[0]!;
  const points: WmwAccountReturnPoint[] = [
    { date: first.date, cumulativeReturn: 0 },
  ];

  let wealthFactor = 1;

  for (let i = 1; i < balances.length; i++) {
    const prev = balances[i - 1]!;
    const curr = balances[i]!;
    const netCf = cashflows
      .filter((cf) => cf.date > prev.date && cf.date <= curr.date)
      .reduce((sum, cf) => sum + cf.amount, 0);

    if (prev.balance !== 0) {
      const periodReturn =
        (curr.balance - prev.balance - netCf) / prev.balance;
      wealthFactor *= 1 + periodReturn;
    }

    points.push({
      date: curr.date,
      cumulativeReturn: wealthFactor - 1,
    });
  }

  return points;
}

/**
 * Collapse cumulative Mileage readings to miles driven each calendar month.
 * Uses the last reading in each month; first month has no delta and is dropped.
 */
export function buildMonthlyMileageDeltas(
  readings: WmwAccountQuantityPoint[],
): WmwAccountQuantityPoint[] {
  if (readings.length === 0) {
    return [];
  }

  const byMonth = new Map<string, WmwAccountQuantityPoint>();
  for (const reading of readings) {
    const month = reading.date.slice(0, 7);
    const existing = byMonth.get(month);
    if (!existing || reading.date >= existing.date) {
      byMonth.set(month, reading);
    }
  }

  const monthly = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, point]) => point);

  const deltas: WmwAccountQuantityPoint[] = [];
  for (let i = 1; i < monthly.length; i++) {
    const prev = monthly[i - 1]!;
    const curr = monthly[i]!;
    deltas.push({
      date: curr.date,
      value: curr.value - prev.value,
    });
  }
  return deltas;
}

export function buildWmwAccountDetailView(
  snapshot: WmwSnapshot | null,
  accountId: string,
): WmwAccountDetailView {
  if (!snapshot) {
    return { status: 'not-found' };
  }

  const account = snapshot.accounts.find((row) => row.accountId === accountId);
  if (!account) {
    return { status: 'not-found' };
  }

  const category =
    snapshot.categories.find((row) => row.categoryId === account.categoryId) ??
    null;

  const balances = snapshot.balances
    .filter((row) => row.accountId === accountId)
    .slice()
    .sort(byDateAsc);

  const balanceHistory = balances.map((row) => ({
    date: row.date,
    balance: row.balance,
  }));

  const latest = balanceHistory[balanceHistory.length - 1] ?? null;
  const previous = balanceHistory[balanceHistory.length - 2] ?? null;
  const latestBalance = latest?.balance ?? null;
  const balanceMomDelta =
    latest && previous ? latest.balance - previous.balance : null;
  const balanceMomPct =
    latest && previous && previous.balance !== 0
      ? (latest.balance - previous.balance) / previous.balance
      : null;

  const unitsPoints = balances
    .filter((row) => row.units != null)
    .map((row) => ({ date: row.date, value: row.units! }));
  const mileageReadings = balances
    .filter((row) => row.mileage != null)
    .map((row) => ({ date: row.date, value: row.mileage! }));
  const mileagePoints = buildMonthlyMileageDeltas(mileageReadings);

  const cashflows = snapshot.cashflows
    .filter((row) => row.accountId === accountId)
    .slice()
    .sort(byDateAsc);

  const investable = isInvestableCategoryId(account.categoryId);
  const mwr = investable
    ? MWR_PERIODS.map((period) =>
        computeAccountAnnualisedMwr(snapshot, accountId, period),
      )
    : [];

  return {
    status: 'ready',
    asOf: snapshot.asOf,
    account,
    category,
    latestBalance,
    balanceMomDelta,
    balanceMomPct,
    balanceHistory,
    returnHistory: investable
      ? buildReturnHistory(balanceHistory, cashflows)
      : [],
    cashflowSummary: summariseCashflows(cashflows),
    unitsHistory: unitsPoints.length > 0 ? unitsPoints : null,
    mileageHistory: mileagePoints.length > 0 ? mileagePoints : null,
    investable,
    mwr,
  };
}
