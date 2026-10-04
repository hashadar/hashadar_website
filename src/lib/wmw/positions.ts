/**
 * Net positions: Accounts grouped for display (ADR 0012).
 * One position per non-empty Pair ID, one per unpaired Account. Derived only —
 * Net Worth, MWR and the Workbook contract are untouched.
 */

import type {
  AccountNetWorthRow,
  ClassNetWorthRow,
  NetWorthMonth,
} from '@/lib/wmw/net-worth';
import { isAssetCategory } from '@/lib/wmw/paired-accounts';
import type { WmwAccount, WmwCategory, WmwSnapshot } from '@/lib/wmw/types';

export type WmwPositionRole = 'asset' | 'liability';

export type WmwPositionLeg = AccountNetWorthRow & { role: WmwPositionRole };

/**
 * `accountId` / `accountName` / `class` come from the asset leg (or the only
 * leg). For paired positions `balance` is the net figure and `sign` is 1.
 */
export type WmwPosition = AccountNetWorthRow & {
  pairId: string | null;
  legs: WmwPositionLeg[];
};

export type WmwPairMember = {
  account: WmwAccount;
  category: WmwCategory;
  role: WmwPositionRole;
};

export type WmwPairGroup = {
  pairId: string;
  /** Asset leg (first by Account ID), else first leg by Account ID. */
  primary: WmwPairMember;
  /** Primary first, then remaining legs by Account ID. */
  members: WmwPairMember[];
};

function categoryLookup(snapshot: WmwSnapshot): Map<string, WmwCategory> {
  return new Map(snapshot.categories.map((c) => [c.categoryId, c]));
}

export function buildPairGroups(
  snapshot: WmwSnapshot,
): Map<string, WmwPairGroup> {
  const categories = categoryLookup(snapshot);
  const byPair = new Map<string, WmwPairMember[]>();

  for (const account of snapshot.accounts) {
    const pairId = account.pairId?.trim();
    if (!pairId) continue;
    const category = categories.get(account.categoryId);
    if (!category) continue;
    const member: WmwPairMember = {
      account,
      category,
      role: isAssetCategory(category) ? 'asset' : 'liability',
    };
    const list = byPair.get(pairId);
    if (list) list.push(member);
    else byPair.set(pairId, [member]);
  }

  const groups = new Map<string, WmwPairGroup>();
  for (const [pairId, list] of byPair) {
    const sorted = [...list].sort((a, b) =>
      a.account.accountId.localeCompare(b.account.accountId),
    );
    const primary = sorted.find((m) => m.role === 'asset') ?? sorted[0]!;
    groups.set(pairId, {
      pairId,
      primary,
      members: [primary, ...sorted.filter((m) => m !== primary)],
    });
  }
  return groups;
}

/** Pair group containing the Account, or null when unpaired. */
export function findPairGroupForAccount(
  snapshot: WmwSnapshot,
  accountId: string,
): WmwPairGroup | null {
  for (const group of buildPairGroups(snapshot).values()) {
    if (group.members.some((m) => m.account.accountId === accountId)) {
      return group;
    }
  }
  return null;
}

function toLeg(member: WmwPairMember, row: AccountNetWorthRow | undefined) {
  return {
    accountId: member.account.accountId,
    accountName: member.account.accountName,
    categoryId: member.account.categoryId,
    class: member.category.class,
    balance: row?.balance ?? 0,
    sign: member.category.sign,
    contribution: row?.contribution ?? 0,
    role: member.role,
  } satisfies WmwPositionLeg;
}

/**
 * Positions for one month. A position's contribution is the sum of its legs'
 * Balance × Sign. A leg without a Balance that month contributes £0; a pair
 * with no Balances at all that month is omitted (as Accounts are in Gross).
 */
export function groupMonthIntoPositions(
  snapshot: WmwSnapshot,
  month: NetWorthMonth,
): WmwPosition[] {
  const rows = new Map(month.byAccount.map((row) => [row.accountId, row]));
  const groups = buildPairGroups(snapshot);
  const paired = new Set<string>();
  const positions: WmwPosition[] = [];

  for (const group of groups.values()) {
    for (const m of group.members) paired.add(m.account.accountId);
    if (!group.members.some((m) => rows.has(m.account.accountId))) continue;

    const legs = group.members.map((m) =>
      toLeg(m, rows.get(m.account.accountId)),
    );
    const contribution = legs.reduce((sum, leg) => sum + leg.contribution, 0);
    const primary = legs[0]!;
    positions.push({
      accountId: primary.accountId,
      accountName: primary.accountName,
      categoryId: primary.categoryId,
      class: primary.class,
      balance: contribution,
      sign: 1,
      contribution,
      pairId: group.pairId,
      legs,
    });
  }

  const categories = categoryLookup(snapshot);
  for (const row of month.byAccount) {
    if (paired.has(row.accountId)) continue;
    const category = categories.get(row.categoryId);
    const role: WmwPositionRole =
      category && !isAssetCategory(category) ? 'liability' : 'asset';
    positions.push({ ...row, pairId: null, legs: [{ ...row, role }] });
  }

  return positions.sort((a, b) => a.accountId.localeCompare(b.accountId));
}

/** Class totals on the position basis (position takes the asset leg's Class). */
export function positionClassRows(
  positions: WmwPosition[],
): ClassNetWorthRow[] {
  const totals = new Map<string, number>();
  for (const position of positions) {
    totals.set(
      position.class,
      (totals.get(position.class) ?? 0) + position.contribution,
    );
  }
  return [...totals.entries()]
    .map(([className, contribution]) => ({ class: className, contribution }))
    .sort((a, b) => a.class.localeCompare(b.class));
}

/** One primary Account per position (unpaired Accounts and pair asset legs). */
export function listPositionAccounts(snapshot: WmwSnapshot): WmwAccount[] {
  const groups = buildPairGroups(snapshot);
  const paired = new Set<string>();
  const accounts: WmwAccount[] = [];
  for (const group of groups.values()) {
    for (const m of group.members) paired.add(m.account.accountId);
    accounts.push(group.primary.account);
  }
  for (const account of snapshot.accounts) {
    if (!paired.has(account.accountId)) accounts.push(account);
  }
  return accounts;
}

/** Asset and liability totals (both positive) behind a position's net figure. */
export function summarisePositionLegs(legs: WmwPositionLeg[]): {
  assetTotal: number;
  liabilityTotal: number;
} {
  let assetTotal = 0;
  let liabilityTotal = 0;
  for (const leg of legs) {
    if (leg.role === 'asset') assetTotal += leg.contribution;
    else liabilityTotal -= leg.contribution;
  }
  return { assetTotal, liabilityTotal };
}

/** True when the position has more than one leg (a combined pair). */
export function isCombinedPosition(position: WmwPosition): boolean {
  return position.legs.length > 1;
}
