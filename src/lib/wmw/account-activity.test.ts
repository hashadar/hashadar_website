import { describe, expect, it } from 'vitest';
import {
  isAccountActiveInSnapshot,
  partitionAccountsByActivity,
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
});
