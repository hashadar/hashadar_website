/**
 * Active vs inactive Accounts for nav / filtering.
 * Active = non-zero Balance in the headline Net Worth month.
 * Explicit £0 exit or missing that month ⇒ inactive (ADR / CONTEXT).
 */

import { computeNetWorth } from '@/lib/wmw/net-worth';
import { buildPositionDefs } from '@/lib/wmw/positions';
import type { WmwAccount, WmwSnapshot } from '@/lib/wmw/types';

export function isAccountActiveInSnapshot(
  snapshot: WmwSnapshot,
  accountId: string,
): boolean {
  const headline = computeNetWorth(snapshot).headline;
  if (!headline) return false;
  const row = headline.byAccount.find(
    (account) => account.accountId === accountId,
  );
  return row != null && row.balance !== 0;
}

export type WmwAccountActivityGroups = {
  active: WmwAccount[];
  inactive: WmwAccount[];
};

export function partitionAccountsByActivity(
  snapshot: WmwSnapshot,
): WmwAccountActivityGroups {
  const active: WmwAccount[] = [];
  const inactive: WmwAccount[] = [];
  for (const account of snapshot.accounts) {
    if (isAccountActiveInSnapshot(snapshot, account.accountId)) {
      active.push(account);
    } else {
      inactive.push(account);
    }
  }
  const byName = (a: WmwAccount, b: WmwAccount) =>
    a.accountName.localeCompare(b.accountName);
  return {
    active: active.sort(byName),
    inactive: inactive.sort(byName),
  };
}

/** Sidebar entry: one per position, keyed on the asset leg Account. */
export type WmwNavPosition = {
  accountId: string;
  accountName: string;
  /** Every Account ID the entry covers, so a loan URL still highlights it. */
  memberAccountIds: string[];
};

export type WmwPositionActivityGroups = {
  active: WmwNavPosition[];
  inactive: WmwNavPosition[];
};

/**
 * Active vs inactive positions. A position is active when any leg has a
 * non-zero Balance in the headline Net Worth month.
 */
export function partitionPositionsByActivity(
  snapshot: WmwSnapshot,
): WmwPositionActivityGroups {
  const active: WmwNavPosition[] = [];
  const inactive: WmwNavPosition[] = [];
  for (const def of buildPositionDefs(snapshot)) {
    const memberAccountIds = def.legs.map((leg) => leg.account.accountId);
    const entry: WmwNavPosition = {
      accountId: def.primaryAccountId,
      accountName: def.name,
      memberAccountIds,
    };
    const isActive = memberAccountIds.some((id) =>
      isAccountActiveInSnapshot(snapshot, id),
    );
    (isActive ? active : inactive).push(entry);
  }
  const byName = (a: WmwNavPosition, b: WmwNavPosition) =>
    a.accountName.localeCompare(b.accountName);
  return { active: active.sort(byName), inactive: inactive.sort(byName) };
}
