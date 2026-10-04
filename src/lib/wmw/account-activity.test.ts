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
      'Porsche Taycan 4S',
    ]);
    expect(groups.inactive.map((a) => a.accountName)).toEqual([
      'Coinbase ETH',
      'HSBC Current',
    ]);
  });

  it('lists a pair once, and keeps it active while either leg is non-zero', () => {
    const snapshot = buildSampleSnapshot({
      balances: [
        {
          date: '2026-04-30',
          accountId: 'CAR_PORSCHE',
          balance: 0,
          units: null,
          mileage: null,
        },
        {
          date: '2026-04-30',
          accountId: 'LOAN_MOTONOVO',
          balance: 5_000,
          units: null,
          mileage: null,
        },
      ],
    });

    const groups = partitionAccountsByActivity(snapshot);
    expect(groups.active.map((a) => a.accountId)).toEqual(['CAR_PORSCHE']);
    expect(
      [...groups.active, ...groups.inactive].some(
        (a) => a.accountId === 'LOAN_MOTONOVO',
      ),
    ).toBe(false);
  });

  it('marks a pair inactive once both legs are £0', () => {
    const snapshot = buildSampleSnapshot({
      balances: [
        {
          date: '2026-04-30',
          accountId: 'CAR_PORSCHE',
          balance: 0,
          units: null,
          mileage: null,
        },
        {
          date: '2026-04-30',
          accountId: 'LOAN_MOTONOVO',
          balance: 0,
          units: null,
          mileage: null,
        },
      ],
    });

    const groups = partitionAccountsByActivity(snapshot);
    expect(groups.active).toEqual([]);
    expect(groups.inactive.map((a) => a.accountId)).toContain('CAR_PORSCHE');
  });
});
