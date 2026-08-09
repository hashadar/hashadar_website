/**
 * Active vs inactive Accounts for nav / filtering.
 * Active = non-zero Balance in the headline Net Worth month.
 * Explicit £0 exit or missing that month ⇒ inactive (ADR / CONTEXT).
 */

import { computeNetWorth } from '@/lib/wmw/net-worth';
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
