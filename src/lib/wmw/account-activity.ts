/**
 * Active vs inactive positions for nav / filtering.
 * A position (unpaired Account or Paired Accounts set) is active when any leg
 * has a non-zero Balance in the headline Net Worth month. An explicit £0 exit
 * or a missing month ⇒ inactive (ADR / CONTEXT).
 */

import { computeNetWorth } from '@/lib/wmw/net-worth';
import {
  findPairGroupForAccount,
  groupMonthIntoPositions,
  listPositionAccounts,
} from '@/lib/wmw/positions';
import type { WmwAccount, WmwSnapshot } from '@/lib/wmw/types';

export function isAccountActiveInSnapshot(
  snapshot: WmwSnapshot,
  accountId: string,
): boolean {
  const headline = computeNetWorth(snapshot).headline;
  if (!headline) return false;
  const group = findPairGroupForAccount(snapshot, accountId);
  const ids = group
    ? group.members.map((m) => m.account.accountId)
    : [accountId];
  return headline.byAccount.some(
    (row) => ids.includes(row.accountId) && row.balance !== 0,
  );
}

export type WmwAccountActivityGroups = {
  /** One primary Account per position (asset leg for pairs). */
  active: WmwAccount[];
  inactive: WmwAccount[];
};

export function partitionAccountsByActivity(
  snapshot: WmwSnapshot,
): WmwAccountActivityGroups {
  const headline = computeNetWorth(snapshot).headline;
  const activeIds = new Set(
    headline
      ? groupMonthIntoPositions(snapshot, headline)
          .filter((position) => position.legs.some((leg) => leg.balance !== 0))
          .map((position) => position.accountId)
      : [],
  );

  const active: WmwAccount[] = [];
  const inactive: WmwAccount[] = [];
  for (const account of listPositionAccounts(snapshot)) {
    if (activeIds.has(account.accountId)) active.push(account);
    else inactive.push(account);
  }
  const byName = (a: WmwAccount, b: WmwAccount) =>
    a.accountName.localeCompare(b.accountName);
  return {
    active: active.sort(byName),
    inactive: inactive.sort(byName),
  };
}
