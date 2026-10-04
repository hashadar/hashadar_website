import { describe, expect, it } from 'vitest';
import {
  buildSampleSnapshot,
  SAMPLE_ACCOUNTS,
} from '@/lib/wmw/fixtures/sample-snapshot';
import { computeNetWorth } from '@/lib/wmw/net-worth';
import {
  buildPositionDefs,
  classRowsFromPositions,
  computePositionHistory,
  computePositions,
  findPositionDef,
} from '@/lib/wmw/positions';
import type { WmwAccount, WmwBalance } from '@/lib/wmw/types';

function march(snapshot = buildSampleSnapshot()) {
  const month = computeNetWorth(snapshot).months.find(
    (m) => m.month === '2026-03',
  )!;
  return { snapshot, month, defs: buildPositionDefs(snapshot) };
}

function balance(accountId: string, amount: number, date = '2026-03-31'): WmwBalance {
  return { date, accountId, balance: amount, units: null, mileage: null };
}

const SECOND_LOAN: WmwAccount = {
  accountId: 'LOAN_SECOND',
  accountName: 'Second loan',
  platform: 'Bank',
  categoryId: 'CAT_LOAN',
  currency: 'GBP',
  pairId: 'PAIR_TAYCAN',
};

describe('buildPositionDefs', () => {
  it('groups the Taycan pair into one position named after the asset Account', () => {
    const defs = buildPositionDefs(buildSampleSnapshot());
    const taycan = defs.find((d) => d.pairId === 'PAIR_TAYCAN')!;

    expect(taycan.positionId).toBe('pair:PAIR_TAYCAN');
    expect(taycan.name).toBe('Porsche Taycan');
    expect(taycan.class).toBe('Cars');
    expect(taycan.primaryAccountId).toBe('CAR_PORSCHE');
    expect(taycan.legs.map((l) => [l.account.accountId, l.role])).toEqual([
      ['CAR_PORSCHE', 'asset'],
      ['LOAN_MOTONOVO', 'liability'],
    ]);
    expect(defs).toHaveLength(SAMPLE_ACCOUNTS.length - 1);
  });

  it('keeps unpaired Accounts as single-leg positions keyed on the Account ID', () => {
    const isa = buildPositionDefs(buildSampleSnapshot()).find(
      (d) => d.positionId === 'IBKR_ISA',
    )!;
    expect(isa.pairId).toBeNull();
    expect(isa.legs).toHaveLength(1);
  });

  it('treats a Pair ID with one Account as a plain position', () => {
    const snapshot = buildSampleSnapshot({
      accounts: SAMPLE_ACCOUNTS.filter((a) => a.accountId !== 'LOAN_MOTONOVO'),
    });
    const car = buildPositionDefs(snapshot).find(
      (d) => d.primaryAccountId === 'CAR_PORSCHE',
    )!;
    expect(car.positionId).toBe('CAR_PORSCHE');
    expect(car.legs).toHaveLength(1);
  });

  it('skips Accounts whose Category is unknown', () => {
    const snapshot = buildSampleSnapshot({
      accounts: [
        ...SAMPLE_ACCOUNTS,
        { ...SECOND_LOAN, accountId: 'ORPHAN', pairId: null, categoryId: 'CAT_NONE' },
      ],
    });
    expect(
      buildPositionDefs(snapshot).some((d) => d.primaryAccountId === 'ORPHAN'),
    ).toBe(false);
  });
});

describe('findPositionDef', () => {
  it('resolves either leg to the same position', () => {
    const { defs } = march();
    expect(findPositionDef(defs, 'LOAN_MOTONOVO')?.positionId).toBe(
      'pair:PAIR_TAYCAN',
    );
    expect(findPositionDef(defs, 'CAR_PORSCHE')?.positionId).toBe(
      'pair:PAIR_TAYCAN',
    );
    expect(findPositionDef(defs, 'NOPE')).toBeNull();
  });
});

describe('computePositions', () => {
  it('nets the car and loan to equity and keeps Net Worth unchanged', () => {
    const { month, defs } = march();
    const positions = computePositions(defs, month);
    const taycan = positions.find((p) => p.pairId === 'PAIR_TAYCAN')!;

    expect(taycan.contribution).toBe(30_000);
    expect(taycan.isNet).toBe(true);
    expect(taycan.negativeEquity).toBe(false);
    expect(taycan.accountIds).toEqual(['CAR_PORSCHE', 'LOAN_MOTONOVO']);
    expect(taycan.legs.map((l) => l.contribution)).toEqual([77_000, -47_000]);
    expect(positions.reduce((sum, p) => sum + p.contribution, 0)).toBe(
      month.total,
    );
  });

  it('shows negative equity as a negative figure', () => {
    const snapshot = buildSampleSnapshot({
      balances: [balance('CAR_PORSCHE', 40_000), balance('LOAN_MOTONOVO', 47_000)],
    });
    const { month, defs } = march(snapshot);
    const taycan = computePositions(defs, month)[0]!;

    expect(taycan.contribution).toBe(-7_000);
    expect(taycan.negativeEquity).toBe(true);
    expect(taycan.class).toBe('Cars');
  });

  it('counts a missing leg as £0 and flags it as unrecorded', () => {
    const snapshot = buildSampleSnapshot({
      balances: [balance('CAR_PORSCHE', 76_000, '2026-04-15')],
    });
    const month = computeNetWorth(snapshot).months[0]!;
    const taycan = computePositions(buildPositionDefs(snapshot), month)[0]!;

    expect(taycan.contribution).toBe(76_000);
    expect(taycan.legs.find((l) => l.accountId === 'LOAN_MOTONOVO')).toMatchObject(
      { balance: 0, recorded: false },
    );
  });

  it('omits a position with no Balance in the month', () => {
    const snapshot = buildSampleSnapshot({
      balances: [balance('IBKR_ISA', 1_000)],
    });
    const month = computeNetWorth(snapshot).months[0]!;
    const positions = computePositions(buildPositionDefs(snapshot), month);
    expect(positions.map((p) => p.positionId)).toEqual(['IBKR_ISA']);
  });

  it('sums every liability leg rather than keeping the last', () => {
    const snapshot = buildSampleSnapshot({
      accounts: [...SAMPLE_ACCOUNTS, SECOND_LOAN],
      balances: [
        balance('CAR_PORSCHE', 77_000),
        balance('LOAN_MOTONOVO', 47_000),
        balance('LOAN_SECOND', 10_000),
      ],
    });
    const { month, defs } = march(snapshot);
    const taycan = computePositions(defs, month)[0]!;

    expect(taycan.legs).toHaveLength(3);
    expect(taycan.contribution).toBe(77_000 - 47_000 - 10_000);
    expect(taycan.accountIds).toEqual([
      'CAR_PORSCHE',
      'LOAN_MOTONOVO',
      'LOAN_SECOND',
    ]);
    expect(month.total).toBe(20_000);
  });

  it('names a liabilities-only pair after its first liability and keeps its Class', () => {
    const snapshot = buildSampleSnapshot({
      accounts: [
        { ...SECOND_LOAN, accountId: 'LOAN_A', accountName: 'Loan A', pairId: 'PAIR_DEBT' },
        { ...SECOND_LOAN, accountId: 'LOAN_B', accountName: 'Loan B', pairId: 'PAIR_DEBT' },
      ],
      balances: [balance('LOAN_A', 5_000), balance('LOAN_B', 3_000)],
    });
    const { month, defs } = march(snapshot);
    const debt = computePositions(defs, month)[0]!;

    expect(debt.name).toBe('Loan A');
    expect(debt.class).toBe('Loans');
    expect(debt.contribution).toBe(-8_000);
    expect(month.total).toBe(-8_000);
  });
});

describe('classRowsFromPositions', () => {
  it('puts the net equity in Cars with no Loans Class for the paired loan', () => {
    const { month, defs } = march();
    const rows = classRowsFromPositions(computePositions(defs, month));

    expect(rows.find((r) => r.class === 'Cars')?.contribution).toBe(30_000);
    expect(rows.some((r) => r.class === 'Loans')).toBe(false);
    expect(rows.reduce((sum, r) => sum + r.contribution, 0)).toBe(month.total);
  });

  it('keeps Loans for an unpaired liability', () => {
    const snapshot = buildSampleSnapshot({
      accounts: [
        ...SAMPLE_ACCOUNTS,
        { ...SECOND_LOAN, accountId: 'LOAN_SOLO', pairId: null },
      ],
      balances: [
        balance('CAR_PORSCHE', 77_000),
        balance('LOAN_MOTONOVO', 47_000),
        balance('LOAN_SOLO', 2_000),
      ],
    });
    const { month, defs } = march(snapshot);
    const rows = classRowsFromPositions(computePositions(defs, month));
    expect(rows.find((r) => r.class === 'Loans')?.contribution).toBe(-2_000);
  });
});

describe('computePositionHistory', () => {
  it('returns net equity per month in ascending order', () => {
    const snapshot = buildSampleSnapshot();
    const def = findPositionDef(buildPositionDefs(snapshot), 'CAR_PORSCHE')!;
    const history = computePositionHistory(def, computeNetWorth(snapshot).months);

    expect(history.map((h) => [h.month, h.position.contribution])).toEqual([
      ['2026-01', 30_000],
      ['2026-02', 30_000],
      ['2026-03', 30_000],
    ]);
  });
});
