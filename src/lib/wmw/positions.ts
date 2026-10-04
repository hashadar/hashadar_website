/**
 * Net positions: Accounts sharing a Pair ID shown as one item (ADR 0012).
 * Contribution is the sum of signed legs; Class and name come from the asset
 * leg. Net Worth totals are unchanged because every leg is counted once.
 */

import type {
  ClassNetWorthRow,
  NetWorthMonth,
} from '@/lib/wmw/net-worth';
import { isAssetCategory } from '@/lib/wmw/paired-accounts';
import type { WmwAccount, WmwCategory, WmwSnapshot } from '@/lib/wmw/types';

export type PositionLegRole = 'asset' | 'liability';

export type WmwPositionLegDef = {
  account: WmwAccount;
  category: WmwCategory;
  role: PositionLegRole;
};

/** Month-independent grouping of Accounts into one position. */
export type WmwPositionDef = {
  /** Account ID for unpaired Accounts, `pair:<Pair ID>` otherwise. */
  positionId: string;
  pairId: string | null;
  /** Asset leg Account name (first leg when there is no asset). */
  name: string;
  class: string;
  categoryId: string;
  /** Asset leg Account ID; the detail page route key. */
  primaryAccountId: string;
  /** Assets first, then liabilities, each by Account ID. */
  legs: WmwPositionLegDef[];
};

export type WmwPositionLeg = {
  accountId: string;
  accountName: string;
  categoryId: string;
  class: string;
  role: PositionLegRole;
  sign: number;
  balance: number;
  /** Balance × Sign. */
  contribution: number;
  /** False when the leg has no Balance that month (counted as £0). */
  recorded: boolean;
};

export type WmwPosition = {
  positionId: string;
  pairId: string | null;
  name: string;
  class: string;
  categoryId: string;
  primaryAccountId: string;
  accountIds: string[];
  legs: WmwPositionLeg[];
  /** Sum of signed leg contributions. */
  contribution: number;
  /** More than one leg, so the contribution is a net figure. */
  isNet: boolean;
  /** Net position whose liabilities exceed its assets. */
  negativeEquity: boolean;
};

function roleOf(category: WmwCategory): PositionLegRole {
  return isAssetCategory(category) ? 'asset' : 'liability';
}

function legOrder(a: WmwPositionLegDef, b: WmwPositionLegDef): number {
  if (a.role !== b.role) return a.role === 'asset' ? -1 : 1;
  return a.account.accountId.localeCompare(b.account.accountId);
}

function defFromLegs(
  positionId: string,
  pairId: string | null,
  legs: WmwPositionLegDef[],
): WmwPositionDef {
  const sorted = [...legs].sort(legOrder);
  const primary = sorted[0]!;
  return {
    positionId,
    pairId,
    name: primary.account.accountName,
    class: primary.category.class,
    categoryId: primary.category.categoryId,
    primaryAccountId: primary.account.accountId,
    legs: sorted,
  };
}

/**
 * Group Accounts into positions: one per Pair ID with two or more Accounts,
 * one per remaining Account. Accounts without a Category are skipped, as in
 * Net Worth.
 */
export function buildPositionDefs(snapshot: WmwSnapshot): WmwPositionDef[] {
  const categories = new Map(snapshot.categories.map((c) => [c.categoryId, c]));
  const paired = new Map<string, WmwPositionLegDef[]>();
  const singles: WmwPositionLegDef[] = [];

  for (const account of snapshot.accounts) {
    const category = categories.get(account.categoryId);
    if (!category) continue;
    const leg: WmwPositionLegDef = {
      account,
      category,
      role: roleOf(category),
    };
    const pairId = account.pairId?.trim();
    if (!pairId) {
      singles.push(leg);
      continue;
    }
    const group = paired.get(pairId);
    if (group) group.push(leg);
    else paired.set(pairId, [leg]);
  }

  const defs: WmwPositionDef[] = [];
  for (const [pairId, legs] of paired) {
    if (legs.length === 1) {
      defs.push(defFromLegs(legs[0]!.account.accountId, pairId, legs));
    } else {
      defs.push(defFromLegs(`pair:${pairId}`, pairId, legs));
    }
  }
  for (const leg of singles) {
    defs.push(defFromLegs(leg.account.accountId, null, [leg]));
  }

  return defs.sort((a, b) => a.positionId.localeCompare(b.positionId));
}

/** Position containing the Account, or null when the Account is unknown. */
export function findPositionDef(
  defs: WmwPositionDef[],
  accountId: string,
): WmwPositionDef | null {
  return (
    defs.find((def) =>
      def.legs.some((leg) => leg.account.accountId === accountId),
    ) ?? null
  );
}

function positionForMonth(
  def: WmwPositionDef,
  month: NetWorthMonth,
): WmwPosition | null {
  const rows = new Map(month.byAccount.map((row) => [row.accountId, row]));
  const legs: WmwPositionLeg[] = def.legs.map((leg) => {
    const row = rows.get(leg.account.accountId);
    const balance = row?.balance ?? 0;
    return {
      accountId: leg.account.accountId,
      accountName: leg.account.accountName,
      categoryId: leg.category.categoryId,
      class: leg.category.class,
      role: leg.role,
      sign: leg.category.sign,
      balance,
      contribution: balance * leg.category.sign,
      recorded: row !== undefined,
    };
  });

  if (!legs.some((leg) => leg.recorded)) return null;

  const contribution = legs.reduce((sum, leg) => sum + leg.contribution, 0);
  const isNet = legs.length > 1;
  return {
    positionId: def.positionId,
    pairId: def.pairId,
    name: def.name,
    class: def.class,
    categoryId: def.categoryId,
    primaryAccountId: def.primaryAccountId,
    accountIds: legs.map((leg) => leg.accountId),
    legs,
    contribution,
    isNet,
    negativeEquity: isNet && contribution < 0,
  };
}

/** Positions with at least one Balance in the month. */
export function computePositions(
  defs: WmwPositionDef[],
  month: NetWorthMonth,
): WmwPosition[] {
  const positions: WmwPosition[] = [];
  for (const def of defs) {
    const position = positionForMonth(def, month);
    if (position) positions.push(position);
  }
  return positions;
}

/** Class totals on the net basis; the sum equals the month's Net Worth total. */
export function classRowsFromPositions(
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

/** One position across months, ascending; months without any leg Balance are omitted. */
export function computePositionHistory(
  def: WmwPositionDef,
  months: NetWorthMonth[],
): Array<{ month: string; position: WmwPosition }> {
  const history: Array<{ month: string; position: WmwPosition }> = [];
  for (const month of months) {
    const position = positionForMonth(def, month);
    if (position) history.push({ month: month.month, position });
  }
  return history;
}
