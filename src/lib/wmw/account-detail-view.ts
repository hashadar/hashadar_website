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

export type WmwAccountQuantityPoint = {
  date: string;
  value: number;
};

export type WmwAccountDetailView =
  | { status: 'not-found' }
  | {
      status: 'ready';
      asOf: string;
      account: WmwAccount;
      category: WmwCategory | null;
      balanceHistory: WmwAccountBalancePoint[];
      cashflows: WmwCashflow[];
      /** Present when any Balance row has Units. */
      unitsHistory: WmwAccountQuantityPoint[] | null;
      /** Present when any Balance row has Mileage. */
      mileageHistory: WmwAccountQuantityPoint[] | null;
      investable: boolean;
      /** YTD / 1Y / Max when investable; otherwise empty. */
      mwr: AccountAnnualisedMwr[];
    };

function byDateAsc(a: { date: string }, b: { date: string }): number {
  return a.date.localeCompare(b.date);
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

  const unitsPoints = balances
    .filter((row) => row.units != null)
    .map((row) => ({ date: row.date, value: row.units! }));
  const mileagePoints = balances
    .filter((row) => row.mileage != null)
    .map((row) => ({ date: row.date, value: row.mileage! }));

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
    balanceHistory,
    cashflows,
    unitsHistory: unitsPoints.length > 0 ? unitsPoints : null,
    mileageHistory: mileagePoints.length > 0 ? mileagePoints : null,
    investable,
    mwr,
  };
}
