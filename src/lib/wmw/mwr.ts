import {
  WMW_INVESTABLE_CATEGORY_IDS,
  type WmwBalance,
  type WmwCashflow,
  type WmwInvestableCategoryId,
  type WmwSnapshot,
} from '@/lib/wmw/types';

/** Investable = Category allow-list only (not cash / vehicle / loan). */
export const INVESTABLE_CATEGORY_IDS = WMW_INVESTABLE_CATEGORY_IDS;

export type InvestableCategoryId = WmwInvestableCategoryId;

export type MwrPeriod = 'YTD' | '1Y' | 'Max';

export type MwrUnavailableReason =
  | 'not-investable'
  | 'account-not-found'
  | 'no-opening-balance'
  | 'no-closing-balance'
  | 'no-usable-cashflows'
  | 'invalid-period'
  | 'irr-failed';

export type AccountAnnualisedMwr =
  | {
      status: 'available';
      accountId: string;
      period: MwrPeriod;
      /** Decimal annualised rate (0.12 = 12% p.a.). */
      annualisedRate: number;
      /** Headline MWR is always annualised. */
      label: 'annualised';
      periodStart: string;
      periodEnd: string;
    }
  | {
      status: 'unavailable';
      accountId: string;
      period: MwrPeriod;
      reason: MwrUnavailableReason;
    };

const MWR_CASHFLOW_TYPES = new Set(['Contribution', 'Withdrawal']);
const DAYS_PER_YEAR = 365.25;

export function isInvestableCategoryId(categoryId: string): boolean {
  return (INVESTABLE_CATEGORY_IDS as readonly string[]).includes(categoryId);
}

export function isInvestableAccount(
  snapshot: WmwSnapshot,
  accountId: string,
): boolean {
  const account = snapshot.accounts.find((row) => row.accountId === accountId);
  return account != null && isInvestableCategoryId(account.categoryId);
}

/**
 * Annualised Money-Weighted Return for one Account over YTD, 1Y, or Max.
 * Workbook Amounts are account-perspective; converted to investor IRR orientation.
 */
export function computeAccountAnnualisedMwr(
  snapshot: WmwSnapshot,
  accountId: string,
  period: MwrPeriod,
  options?: { asOfDate?: string },
): AccountAnnualisedMwr {
  const account = snapshot.accounts.find((row) => row.accountId === accountId);
  if (!account) {
    return unavailable(accountId, period, 'account-not-found');
  }
  if (!isInvestableCategoryId(account.categoryId)) {
    return unavailable(accountId, period, 'not-investable');
  }

  const asOfDate = options?.asOfDate ?? snapshotAsOfDate(snapshot.asOf);
  const balances = snapshot.balances
    .filter((row) => row.accountId === accountId)
    .slice()
    .sort(byDateThenIndex);

  if (balances.length === 0) {
    return unavailable(accountId, period, 'no-opening-balance');
  }

  const firstBalanceDate = balances[0]!.date;
  const latestBalanceDate = balances[balances.length - 1]!.date;
  const window = resolvePeriodWindow(
    period,
    asOfDate,
    firstBalanceDate,
    latestBalanceDate,
  );
  if (!window) {
    return unavailable(accountId, period, 'invalid-period');
  }

  const opening = lastBalanceOnOrBefore(balances, window.start);
  if (!opening) {
    return unavailable(accountId, period, 'no-opening-balance');
  }

  const closing = lastBalanceOnOrBefore(balances, window.end);
  if (!closing) {
    return unavailable(accountId, period, 'no-closing-balance');
  }

  const usableCashflows = snapshot.cashflows.filter(
    (cf) =>
      cf.accountId === accountId &&
      MWR_CASHFLOW_TYPES.has(cf.transactionType) &&
      cf.date >= firstBalanceDate &&
      cf.date >= window.start &&
      cf.date <= window.end,
  );

  if (usableCashflows.length === 0) {
    return unavailable(accountId, period, 'no-usable-cashflows');
  }

  const investorFlows = buildInvestorFlows(
    opening,
    usableCashflows,
    closing,
    window.start,
  );
  const annualisedRate = solveAnnualisedIrr(investorFlows);
  if (annualisedRate == null || !Number.isFinite(annualisedRate)) {
    return unavailable(accountId, period, 'irr-failed');
  }

  return {
    status: 'available',
    accountId,
    period,
    annualisedRate,
    label: 'annualised',
    periodStart: window.start,
    periodEnd: window.end,
  };
}

export function computeInvestableAccountsAnnualisedMwr(
  snapshot: WmwSnapshot,
  period: MwrPeriod,
  options?: { asOfDate?: string },
): AccountAnnualisedMwr[] {
  return snapshot.accounts
    .filter((account) => isInvestableCategoryId(account.categoryId))
    .map((account) =>
      computeAccountAnnualisedMwr(snapshot, account.accountId, period, options),
    );
}

function unavailable(
  accountId: string,
  period: MwrPeriod,
  reason: MwrUnavailableReason,
): AccountAnnualisedMwr {
  return { status: 'unavailable', accountId, period, reason };
}

function snapshotAsOfDate(asOf: string): string {
  return asOf.slice(0, 10);
}

function resolvePeriodWindow(
  period: MwrPeriod,
  asOfDate: string,
  firstBalanceDate: string,
  latestBalanceDate: string,
): { start: string; end: string } | null {
  if (period === 'Max') {
    if (firstBalanceDate > latestBalanceDate) {
      return null;
    }
    return { start: firstBalanceDate, end: latestBalanceDate };
  }

  if (!isIsoDate(asOfDate)) {
    return null;
  }

  const end = asOfDate;
  const start =
    period === 'YTD' ? `${asOfDate.slice(0, 4)}-01-01` : shiftIsoYears(asOfDate, -1);

  if (!start || start > end) {
    return null;
  }
  return { start, end };
}

function lastBalanceOnOrBefore(
  balances: WmwBalance[],
  date: string,
): WmwBalance | null {
  let found: WmwBalance | null = null;
  for (const balance of balances) {
    if (balance.date <= date) {
      found = balance;
    } else {
      break;
    }
  }
  return found;
}

type DatedFlow = { date: string; amount: number; yearsFromStart: number };

function buildInvestorFlows(
  opening: WmwBalance,
  cashflows: WmwCashflow[],
  closing: WmwBalance,
  periodStart: string,
): DatedFlow[] {
  const flows: DatedFlow[] = [
    {
      date: periodStart,
      // Investor IRR: −MV₀
      amount: -opening.balance,
      yearsFromStart: 0,
    },
  ];

  const sorted = cashflows.slice().sort(byDateThenIndex);
  for (const cf of sorted) {
    flows.push({
      date: cf.date,
      // Account-perspective → investor: negate
      amount: -cf.amount,
      yearsFromStart: yearFraction(periodStart, cf.date),
    });
  }

  flows.push({
    date: closing.date,
    // Investor IRR: +MV₁
    amount: closing.balance,
    yearsFromStart: yearFraction(periodStart, closing.date),
  });

  return flows;
}

function yearFraction(start: string, end: string): number {
  const days =
    (utcDay(end).getTime() - utcDay(start).getTime()) / (24 * 60 * 60 * 1000);
  return days / DAYS_PER_YEAR;
}

function solveAnnualisedIrr(flows: DatedFlow[]): number | null {
  const npv = (rate: number) =>
    flows.reduce((sum, flow) => {
      const base = 1 + rate;
      if (base <= 0) {
        return Number.NaN;
      }
      return sum + flow.amount / base ** flow.yearsFromStart;
    }, 0);

  const derivative = (rate: number) =>
    flows.reduce((sum, flow) => {
      const base = 1 + rate;
      if (base <= 0 || flow.yearsFromStart === 0) {
        return sum;
      }
      return (
        sum -
        (flow.yearsFromStart * flow.amount) / base ** (flow.yearsFromStart + 1)
      );
    }, 0);

  let rate = 0.1;
  for (let i = 0; i < 50; i += 1) {
    const y = npv(rate);
    if (!Number.isFinite(y)) {
      break;
    }
    if (Math.abs(y) < 1e-7) {
      return rate;
    }
    const dy = derivative(rate);
    if (!Number.isFinite(dy) || Math.abs(dy) < 1e-12) {
      break;
    }
    const next = rate - y / dy;
    if (!Number.isFinite(next) || next <= -0.999999) {
      break;
    }
    rate = next;
  }

  // Bisection fallback over a wide annualised band
  let low = -0.9999;
  let high = 10;
  const npvLow = npv(low);
  const npvHigh = npv(high);
  if (!Number.isFinite(npvLow) || !Number.isFinite(npvHigh) || npvLow * npvHigh > 0) {
    // Expand high if same sign
    for (let h = 20; h <= 100; h *= 2) {
      const y = npv(h);
      if (Number.isFinite(y) && npvLow * y <= 0) {
        high = h;
        break;
      }
    }
    if (npv(low) * npv(high) > 0) {
      return null;
    }
  }

  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    const y = npv(mid);
    if (!Number.isFinite(y) || Math.abs(y) < 1e-7) {
      return mid;
    }
    if (npv(low) * y <= 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return (low + high) / 2;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(utcDay(value).getTime());
}

function utcDay(isoDate: string): Date {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  return new Date(Date.UTC(year, month - 1, day));
}

/** Shift calendar years; clamps 29 Feb to 28 Feb when the target year is not a leap year. */
function shiftIsoYears(isoDate: string, years: number): string | null {
  if (!isIsoDate(isoDate)) {
    return null;
  }
  const year = Number(isoDate.slice(0, 4)) + years;
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCMonth() !== month - 1) {
    const clamped = new Date(Date.UTC(year, month, 0));
    return clamped.toISOString().slice(0, 10);
  }
  return candidate.toISOString().slice(0, 10);
}

function byDateThenIndex<T extends { date: string }>(a: T, b: T): number {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}
