/**
 * Pure Account detail view-model from a Snapshot (injectable; no Sheets / Amplify).
 */

import {
  computeAccountAnnualisedMwr,
  isInvestableCategoryId,
  type AccountAnnualisedMwr,
  type MwrPeriod,
} from '@/lib/wmw/mwr';
import { computeNetWorth } from '@/lib/wmw/net-worth';
import {
  buildPositionDefs,
  computePositionHistory,
  findPositionDef,
  type PositionLegRole,
  type WmwPositionLeg,
} from '@/lib/wmw/positions';
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
  /** Absolute total of Loan Repayment Cashflows. */
  loanRepaymentTotal: number;
  firstDate: string | null;
  lastDate: string | null;
};

/** Detail for one Account (one leg of a position, or an unpaired Account). */
export type WmwAccountLegDetail = {
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

export type WmwPositionDetailLeg = WmwAccountLegDetail & {
  role: PositionLegRole;
};

/** Combined view of Paired Accounts: net equity plus every leg's detail. */
export type WmwPositionDetail = {
  pairId: string | null;
  name: string;
  /** Latest month with any leg Balance, or null when none. */
  latestMonth: string | null;
  /** Legs at the latest month (assets first). */
  legs: WmwPositionLeg[];
  /** Latest net equity (sum of signed legs), or null when none. */
  netEquity: number | null;
  netMomDelta: number | null;
  netMomPct: number | null;
  negativeEquity: boolean;
  /** Net equity per calendar month, ascending. */
  netHistory: Array<{ month: string; netEquity: number }>;
  legDetails: WmwPositionDetailLeg[];
};

export type WmwAccountDetailView =
  | { status: 'not-found' }
  | ({
      status: 'ready';
      asOf: string;
      /** Set when the Account belongs to Paired Accounts. */
      position: WmwPositionDetail | null;
    } & WmwAccountLegDetail);

function byDateAsc(a: { date: string }, b: { date: string }): number {
  return a.date.localeCompare(b.date);
}

function summariseCashflows(cashflows: WmwCashflow[]): WmwAccountCashflowSummary {
  let contributionTotal = 0;
  let withdrawalTotal = 0;
  let loanRepaymentTotal = 0;
  let netAmount = 0;

  for (const cf of cashflows) {
    netAmount += cf.amount;
    if (cf.transactionType === 'Contribution') {
      contributionTotal += cf.amount;
    } else if (cf.transactionType === 'Withdrawal') {
      withdrawalTotal += Math.abs(cf.amount);
    } else if (cf.transactionType === 'Loan Repayment') {
      loanRepaymentTotal += Math.abs(cf.amount);
    }
  }

  return {
    count: cashflows.length,
    netAmount,
    contributionTotal,
    withdrawalTotal,
    loanRepaymentTotal,
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

function buildLegDetail(
  snapshot: WmwSnapshot,
  account: WmwAccount,
): WmwAccountLegDetail {
  const accountId = account.accountId;
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

function buildPositionDetail(
  snapshot: WmwSnapshot,
  accountId: string,
): { primary: WmwAccount; position: WmwPositionDetail } | null {
  const def = findPositionDef(buildPositionDefs(snapshot), accountId);
  if (!def || def.legs.length < 2) return null;

  const history = computePositionHistory(def, computeNetWorth(snapshot).months);
  const latest = history[history.length - 1] ?? null;
  const previous = history[history.length - 2] ?? null;
  const netEquity = latest?.position.contribution ?? null;
  const priorEquity = previous?.position.contribution ?? null;

  return {
    primary: def.legs[0]!.account,
    position: {
      pairId: def.pairId,
      name: def.name,
      latestMonth: latest?.month ?? null,
      legs: latest?.position.legs ?? [],
      netEquity,
      netMomDelta:
        netEquity !== null && priorEquity !== null
          ? netEquity - priorEquity
          : null,
      netMomPct:
        netEquity !== null && priorEquity !== null && priorEquity !== 0
          ? (netEquity - priorEquity) / Math.abs(priorEquity)
          : null,
      negativeEquity: netEquity !== null && netEquity < 0,
      netHistory: history.map(({ month, position }) => ({
        month,
        netEquity: position.contribution,
      })),
      legDetails: def.legs.map((leg) => ({
        ...buildLegDetail(snapshot, leg.account),
        role: leg.role,
      })),
    },
  };
}

/**
 * Detail for an Account. Accounts in Paired Accounts resolve to one combined
 * view keyed on the asset leg, whichever leg's ID was requested.
 */
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

  const paired = buildPositionDetail(snapshot, accountId);
  const primary = paired?.primary ?? account;

  return {
    status: 'ready',
    asOf: snapshot.asOf,
    position: paired?.position ?? null,
    ...buildLegDetail(snapshot, primary),
  };
}
