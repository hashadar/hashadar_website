/**
 * Financed pair equity from Paired Accounts sharing a Pair ID.
 * Equity = asset leg Balance − liability leg Balance (legs via Category Type / Sign).
 */

import { computeNetWorth, type NetWorthMonth } from '@/lib/wmw/net-worth';
import type {
  CalendarMonth,
  WmwAccount,
  WmwCategory,
  WmwSnapshot,
} from '@/lib/wmw/types';

export type PairLeg = {
  accountId: string;
  accountName: string;
  categoryId: string;
  type: WmwCategory['type'];
  sign: number;
  balance: number;
  /** Balance × Sign (pair’s contribution to Net Worth). */
  contribution: number;
};

export type PairEquity = {
  pairId: string;
  month: CalendarMonth;
  /** Asset Balance − liability Balance (raw legs). */
  equity: number;
  /** Sum of signed contributions for the pair (equals equity when signs are ±1). */
  netWorthContribution: number;
  asset: PairLeg | null;
  liability: PairLeg | null;
};

function categoryById(snapshot: WmwSnapshot): Map<string, WmwCategory> {
  return new Map(snapshot.categories.map((c) => [c.categoryId, c]));
}

function accountsByPair(snapshot: WmwSnapshot): Map<string, WmwAccount[]> {
  const groups = new Map<string, WmwAccount[]>();
  for (const account of snapshot.accounts) {
    const pairId = account.pairId?.trim();
    if (!pairId) continue;
    const list = groups.get(pairId);
    if (list) list.push(account);
    else groups.set(pairId, [account]);
  }
  return groups;
}

function legFromMonth(
  account: WmwAccount,
  category: WmwCategory,
  month: NetWorthMonth,
): PairLeg {
  const row = month.byAccount.find((a) => a.accountId === account.accountId);
  const balance = row?.balance ?? 0;
  const contribution = balance * category.sign;
  return {
    accountId: account.accountId,
    accountName: account.accountName,
    categoryId: account.categoryId,
    type: category.type,
    sign: category.sign,
    balance,
    contribution,
  };
}

function isAssetCategory(category: WmwCategory): boolean {
  if (category.type === 'Asset') return true;
  if (category.type === 'Liability') return false;
  return category.sign >= 0;
}

/**
 * Pair equity for every non-empty Pair ID in the Snapshot, for the given month
 * (defaults to headline Net Worth month). Missing legs contribute £0 Balance.
 */
export function computePairEquity(
  snapshot: WmwSnapshot,
  month?: CalendarMonth,
): PairEquity[] {
  const netWorth = computeNetWorth(snapshot);
  const targetMonth =
    month ??
    netWorth.headline?.month ??
    null;
  if (!targetMonth) return [];

  const monthResult =
    netWorth.months.find((m) => m.month === targetMonth) ??
    ({
      month: targetMonth,
      total: 0,
      byAccount: [],
      byClass: [],
    } satisfies NetWorthMonth);

  const categories = categoryById(snapshot);
  const pairs = accountsByPair(snapshot);
  const results: PairEquity[] = [];

  for (const pairId of [...pairs.keys()].sort()) {
    const members = pairs.get(pairId)!;
    let asset: PairLeg | null = null;
    let liability: PairLeg | null = null;

    for (const account of members) {
      const category = categories.get(account.categoryId);
      if (!category) continue;
      const leg = legFromMonth(account, category, monthResult);
      if (isAssetCategory(category)) {
        asset = leg;
      } else {
        liability = leg;
      }
    }

    const assetBalance = asset?.balance ?? 0;
    const liabilityBalance = liability?.balance ?? 0;
    const equity = assetBalance - liabilityBalance;
    const netWorthContribution =
      (asset?.contribution ?? 0) + (liability?.contribution ?? 0);

    results.push({
      pairId,
      month: targetMonth,
      equity,
      netWorthContribution,
      asset,
      liability,
    });
  }

  return results;
}
