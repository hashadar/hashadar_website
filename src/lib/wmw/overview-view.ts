/**
 * Pure Overview view-model from a Snapshot (injectable; no Sheets / Amplify).
 */

import { computeNetWorth } from '@/lib/wmw/net-worth';
import { computePairEquity } from '@/lib/wmw/paired-accounts';
import {
  computeInvestableAccountsAnnualisedMwr,
  type AccountAnnualisedMwr,
  type MwrPeriod,
} from '@/lib/wmw/mwr';
import type { PairEquity } from '@/lib/wmw/paired-accounts';
import type { NetWorthMonth, NetWorthResult } from '@/lib/wmw/net-worth';
import type { WmwSnapshot } from '@/lib/wmw/types';

export type WmwOverviewView = {
  asOf: string;
  warnings: WmwSnapshot['warnings'];
  netWorth: NetWorthResult;
  headline: NetWorthMonth | null;
  history: Array<{ month: string; total: number }>;
  pairs: PairEquity[];
  mwr: AccountAnnualisedMwr[];
  accountNames: Map<string, string>;
};

export function buildWmwOverviewView(
  snapshot: WmwSnapshot,
  period: MwrPeriod,
): WmwOverviewView {
  const netWorth = computeNetWorth(snapshot);
  const accountNames = new Map(
    snapshot.accounts.map((a) => [a.accountId, a.accountName]),
  );

  return {
    asOf: snapshot.asOf,
    warnings: snapshot.warnings,
    netWorth,
    headline: netWorth.headline,
    history: netWorth.months.map((m) => ({
      month: m.month,
      total: m.total,
    })),
    pairs: computePairEquity(snapshot),
    mwr: computeInvestableAccountsAnnualisedMwr(snapshot, period),
    accountNames,
  };
}
