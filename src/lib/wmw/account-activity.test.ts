import { describe, expect, it } from 'vitest';
import {
  isAccountActiveInSnapshot,
  partitionAccountsByActivity,
  partitionPositionsByActivity,
} from '@/lib/wmw/account-activity';
import { buildSampleSnapshot } from '@/lib/wmw/fixtures/sample-snapshot';

describe('account activity', () => {
  it('treats non-zero headline Balances as active and £0 / missing as inactive', () => {
    const snapshot = buildSampleSnapshot();

    expect(isAccountActiveInSnapshot(snapshot, 'IBKR_ISA')).toBe(true);
    expect(isAccountActiveInSnapshot(snapshot, 'CAR_PORSCHE')).toBe(true);
    expect(isAccountActiveInSnapshot(snapshot, 'LOAN_MOTONOVO')).toBe(true);
    expect(isAccountActiveInSnapshot(snapshot, 'CB_ETH')).toBe(false);
    expect(isAccountActiveInSnapshot(snapshot, 'CASH_HSBC')).toBe(false);

    const groups = partitionAccountsByActivity(snapshot);
    expect(groups.active.map((a) => a.accountName)).toEqual([
      'IBKR ISA',
      'Motonovo',
      'Porsche Taycan',
    ]);
    expect(groups.inactive.map((a) => a.accountName)).toEqual([
      'Coinbase ETH',
      'HSBC Current',
    ]);
  });

  it('lists one active entry for the paired car and loan', () => {
    const groups = partitionPositionsByActivity(buildSampleSnapshot());

    expect(groups.active.map((e) => e.accountName)).toEqual([
      'IBKR ISA',
      'Porsche Taycan',
    ]);
    const taycan = groups.active.find((e) => e.accountId === 'CAR_PORSCHE');
    expect(taycan?.memberAccountIds).toEqual(['CAR_PORSCHE', 'LOAN_MOTONOVO']);
    expect(groups.inactive.map((e) => e.accountName)).toEqual([
      'Coinbase ETH',
      'HSBC Current',
    ]);
  });

  it('keeps a position active while only the loan has a Balance', () => {
    const groups = partitionPositionsByActivity(
      buildSampleSnapshot({
        balances: [
          { date: '2026-04-30', accountId: 'LOAN_MOTONOVO', balance: 5_000, units: null, mileage: null },
        ],
      }),
    );
    expect(groups.active.map((e) => e.accountName)).toEqual(['Porsche Taycan']);
  });
});
