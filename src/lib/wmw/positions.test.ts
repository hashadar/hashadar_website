import { describe, expect, it } from 'vitest';
import { buildSampleSnapshot } from '@/lib/wmw/fixtures/sample-snapshot';
import { computeNetWorth } from '@/lib/wmw/net-worth';
import {
  groupMonthIntoPositions,
  listPositionAccounts,
  positionClassRows,
  summarisePositionLegs,
} from '@/lib/wmw/positions';

function monthOf(snapshot: ReturnType<typeof buildSampleSnapshot>, month: string) {
  const found = computeNetWorth(snapshot).months.find((m) => m.month === month);
  if (!found) throw new Error(`no month ${month}`);
  return found;
}

describe('groupMonthIntoPositions', () => {
  it('nets a complete pair into one position on the asset leg', () => {
    const snapshot = buildSampleSnapshot();
    const positions = groupMonthIntoPositions(snapshot, monthOf(snapshot, '2026-03'));

    const taycan = positions.find((p) => p.pairId === 'PAIR_TAYCAN')!;
    expect(taycan.accountId).toBe('CAR_PORSCHE');
    expect(taycan.accountName).toBe('Porsche Taycan 4S');
    expect(taycan.class).toBe('Cars');
    expect(taycan.contribution).toBe(30_000);
    expect(taycan.legs.map((l) => [l.accountId, l.role, l.contribution])).toEqual([
      ['CAR_PORSCHE', 'asset', 77_000],
      ['LOAN_MOTONOVO', 'liability', -47_000],
    ]);
    expect(
      positions.some((p) => p.accountId === 'LOAN_MOTONOVO'),
    ).toBe(false);
  });

  it('keeps an unpaired Account as a single-leg position', () => {
    const snapshot = buildSampleSnapshot();
    const positions = groupMonthIntoPositions(snapshot, monthOf(snapshot, '2026-03'));

    const isa = positions.find((p) => p.accountId === 'IBKR_ISA')!;
    expect(isa.pairId).toBeNull();
    expect(isa.contribution).toBe(23_000);
    expect(isa.legs).toHaveLength(1);
  });

  it('preserves the Net Worth total across positions', () => {
    const snapshot = buildSampleSnapshot();
    for (const month of computeNetWorth(snapshot).months) {
      const total = groupMonthIntoPositions(snapshot, month).reduce(
        (sum, p) => sum + p.contribution,
        0,
      );
      expect(total).toBe(month.total);
    }
  });

  it('shows negative equity as a negative contribution', () => {
    const snapshot = buildSampleSnapshot({
      balances: [
        { date: '2026-04-30', accountId: 'CAR_PORSCHE', balance: 40_000, units: null, mileage: null },
        { date: '2026-04-30', accountId: 'LOAN_MOTONOVO', balance: 45_000, units: null, mileage: null },
      ],
    });
    const [position] = groupMonthIntoPositions(snapshot, monthOf(snapshot, '2026-04'));

    expect(position!.contribution).toBe(-5_000);
    expect(summarisePositionLegs(position!.legs)).toEqual({
      assetTotal: 40_000,
      liabilityTotal: 45_000,
    });
  });

  it('treats a leg without a Balance that month as £0 (no carry-forward)', () => {
    const snapshot = buildSampleSnapshot({
      balances: [
        { date: '2026-04-30', accountId: 'CAR_PORSCHE', balance: 76_000, units: null, mileage: null },
      ],
    });
    const [position] = groupMonthIntoPositions(snapshot, monthOf(snapshot, '2026-04'));

    expect(position!.contribution).toBe(76_000);
    expect(position!.legs.find((l) => l.accountId === 'LOAN_MOTONOVO')).toMatchObject({
      balance: 0,
      contribution: 0,
    });
  });

  it('omits a pair with no Balances that month', () => {
    const snapshot = buildSampleSnapshot();
    const positions = groupMonthIntoPositions(snapshot, {
      month: '2026-05',
      total: 0,
      byAccount: [],
      byClass: [],
    });
    expect(positions).toEqual([]);
  });

  it('sums every liability on a pair (refinance)', () => {
    const snapshot = buildSampleSnapshot({
      accounts: [
        ...buildSampleSnapshot().accounts,
        {
          accountId: 'LOAN_REFI',
          accountName: 'Refinance Loan',
          platform: 'Bank',
          categoryId: 'CAT_LOAN',
          currency: 'GBP',
          pairId: 'PAIR_TAYCAN',
        },
      ],
      balances: [
        { date: '2026-04-30', accountId: 'CAR_PORSCHE', balance: 70_000, units: null, mileage: null },
        { date: '2026-04-30', accountId: 'LOAN_MOTONOVO', balance: 10_000, units: null, mileage: null },
        { date: '2026-04-30', accountId: 'LOAN_REFI', balance: 30_000, units: null, mileage: null },
      ],
    });
    const [position] = groupMonthIntoPositions(snapshot, monthOf(snapshot, '2026-04'));

    expect(position!.legs).toHaveLength(3);
    expect(position!.contribution).toBe(30_000);
    expect(summarisePositionLegs(position!.legs)).toEqual({
      assetTotal: 70_000,
      liabilityTotal: 40_000,
    });
  });

  it('sums Balance × Sign when Signs are not exactly ±1', () => {
    const snapshot = buildSampleSnapshot({
      categories: [
        { categoryId: 'CAT_VEHICLE', type: 'Asset', class: 'Cars', sign: 0.5 },
        { categoryId: 'CAT_LOAN', type: 'Liability', class: 'Loans', sign: -2 },
      ],
      balances: [
        { date: '2026-04-30', accountId: 'CAR_PORSCHE', balance: 10_000, units: null, mileage: null },
        { date: '2026-04-30', accountId: 'LOAN_MOTONOVO', balance: 1_000, units: null, mileage: null },
      ],
    });
    const [position] = groupMonthIntoPositions(snapshot, monthOf(snapshot, '2026-04'));

    expect(position!.contribution).toBe(10_000 * 0.5 - 1_000 * 2);
  });
});

describe('positionClassRows', () => {
  it('folds the loan into the asset leg Class', () => {
    const snapshot = buildSampleSnapshot();
    const positions = groupMonthIntoPositions(snapshot, monthOf(snapshot, '2026-03'));
    const rows = positionClassRows(positions);

    expect(rows.find((r) => r.class === 'Cars')?.contribution).toBe(30_000);
    expect(rows.some((r) => r.class === 'Loans')).toBe(false);
  });
});

describe('listPositionAccounts', () => {
  it('lists one Account per position, with the asset leg for pairs', () => {
    const ids = listPositionAccounts(buildSampleSnapshot()).map((a) => a.accountId);
    expect(ids).toContain('CAR_PORSCHE');
    expect(ids).not.toContain('LOAN_MOTONOVO');
    expect(ids).toHaveLength(4);
  });
});
