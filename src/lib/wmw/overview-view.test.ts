import { describe, expect, it } from 'vitest';
import { buildSampleSnapshot } from '@/lib/wmw/fixtures/sample-snapshot';
import { buildWmwOverviewView } from '@/lib/wmw/overview-view';

describe('buildWmwOverviewView', () => {
  it('exposes headline Net Worth, history, and Taycan pair', () => {
    const snapshot = buildSampleSnapshot({
      cashflows: [
        {
          date: '2026-01-20',
          accountId: 'IBKR_ISA',
          amount: 20_000,
          transactionType: 'Contribution',
          description: 'Open',
        },
      ],
    });

    const view = buildWmwOverviewView(snapshot);

    expect(view.headline?.month).toBe('2026-03');
    expect(view.selectedMonth).toBe('2026-03');
    expect(view.history.length).toBe(3);
    expect(view.kpis?.netWorth.total).toBe(53_000);
    expect(view.kpis?.netWorth.momDelta).toBe(53_000 - 58_800);
    expect(view.kpis?.generalInvestments.total).toBe(23_000);
    expect(view.kpis?.cashSavings.total).toBe(0);
    expect(view.kpis?.retirement.total).toBe(0);
    expect(view.pairs.some((p) => p.pairId === 'PAIR_TAYCAN')).toBe(true);
    expect(view.accountNames.get('CAR_PORSCHE')).toBe('Porsche Taycan');
    expect(view.classRows[0]?.pctOfNetWorth).not.toBeNull();
  });

  it('honours selectedMonth and accountQuery filters', () => {
    const snapshot = buildSampleSnapshot();
    const view = buildWmwOverviewView(snapshot, {
      selectedMonth: '2026-01',
      accountQuery: 'porsche',
    });

    expect(view.selectedMonth).toBe('2026-01');
    expect(view.kpis?.netWorth.total).toBe(57_000);
    expect(view.accountRows).toHaveLength(1);
    expect(view.accountRows[0]?.accountId).toBe('CAR_PORSCHE');
    expect(view.classHistory).toHaveLength(3);
  });

  describe('basis', () => {
    it('defaults to net: one Taycan row at net equity and no Motonovo row', () => {
      const view = buildWmwOverviewView(buildSampleSnapshot());

      expect(view.basis).toBe('net');
      const ids = view.accountRows.map((r) => r.accountId);
      expect(ids).toContain('CAR_PORSCHE');
      expect(ids).not.toContain('LOAN_MOTONOVO');

      const taycan = view.accountRows.find((r) => r.accountId === 'CAR_PORSCHE')!;
      expect(taycan.accountName).toBe('Porsche Taycan');
      expect(taycan.class).toBe('Cars');
      expect(taycan.contribution).toBe(30_000);
      expect(taycan.pctOfNetWorth).toBeCloseTo(30_000 / 53_000, 6);
      expect(taycan.netPosition).toEqual({
        pairId: 'PAIR_TAYCAN',
        accountIds: ['CAR_PORSCHE', 'LOAN_MOTONOVO'],
        negativeEquity: false,
      });
      expect(
        view.accountRows.find((r) => r.accountId === 'IBKR_ISA')?.netPosition,
      ).toBeNull();
    });

    it('follows the net basis in Class rows and the Class history', () => {
      const view = buildWmwOverviewView(buildSampleSnapshot());

      expect(view.classRows.find((r) => r.class === 'Cars')?.contribution).toBe(
        30_000,
      );
      expect(view.classRows.some((r) => r.class === 'Loans')).toBe(false);
      expect(
        view.classRows.reduce((sum, r) => sum + r.contribution, 0),
      ).toBe(53_000);
      for (const point of view.classHistory) {
        expect(point.byClass.some((r) => r.class === 'Loans')).toBe(false);
        expect(
          point.byClass.reduce((sum, r) => sum + r.contribution, 0),
        ).toBe(view.history.find((h) => h.month === point.month)?.total);
      }
    });

    it('restores the two-row Account and Loans Class view on gross', () => {
      const view = buildWmwOverviewView(buildSampleSnapshot(), {
        basis: 'gross',
      });

      expect(view.basis).toBe('gross');
      const car = view.accountRows.find((r) => r.accountId === 'CAR_PORSCHE')!;
      const loan = view.accountRows.find(
        (r) => r.accountId === 'LOAN_MOTONOVO',
      )!;
      expect(car.contribution).toBe(77_000);
      expect(loan.contribution).toBe(-47_000);
      expect(car.netPosition).toBeNull();
      expect(
        view.classRows.find((r) => r.class === 'Loans')?.contribution,
      ).toBe(-47_000);
    });

    it('leaves Net Worth, KPIs and history identical on both bases', () => {
      const snapshot = buildSampleSnapshot();
      const net = buildWmwOverviewView(snapshot, { basis: 'net' });
      const gross = buildWmwOverviewView(snapshot, { basis: 'gross' });

      expect(net.kpis).toEqual(gross.kpis);
      expect(net.history).toEqual(gross.history);
      expect(net.kpis?.netWorth.total).toBe(53_000);
    });

    it('finds the net position by the loan name, id, or Pair ID', () => {
      for (const accountQuery of ['motonovo', 'LOAN_MOTONOVO', 'pair_taycan']) {
        const view = buildWmwOverviewView(buildSampleSnapshot(), {
          accountQuery,
        });
        expect(view.accountRows.map((r) => r.accountId)).toEqual([
          'CAR_PORSCHE',
        ]);
      }
    });

    it('computes net-to-net MoM for the position', () => {
      const snapshot = buildSampleSnapshot({
        balances: [
          { date: '2026-01-31', accountId: 'CAR_PORSCHE', balance: 80_000, units: null, mileage: null },
          { date: '2026-01-31', accountId: 'LOAN_MOTONOVO', balance: 50_000, units: null, mileage: null },
          { date: '2026-02-28', accountId: 'CAR_PORSCHE', balance: 78_000, units: null, mileage: null },
          { date: '2026-02-28', accountId: 'LOAN_MOTONOVO', balance: 40_000, units: null, mileage: null },
        ],
      });
      const view = buildWmwOverviewView(snapshot);
      const taycan = view.accountRows.find((r) => r.accountId === 'CAR_PORSCHE')!;

      expect(taycan.contribution).toBe(38_000);
      expect(taycan.momDelta).toBe(8_000);
      expect(view.classRows.find((r) => r.class === 'Cars')?.momDelta).toBe(
        8_000,
      );
    });

    it('flags negative equity on the row', () => {
      const snapshot = buildSampleSnapshot({
        balances: [
          { date: '2026-03-31', accountId: 'CAR_PORSCHE', balance: 40_000, units: null, mileage: null },
          { date: '2026-03-31', accountId: 'LOAN_MOTONOVO', balance: 47_000, units: null, mileage: null },
        ],
      });
      const taycan = buildWmwOverviewView(snapshot).accountRows[0]!;

      expect(taycan.contribution).toBe(-7_000);
      expect(taycan.netPosition?.negativeEquity).toBe(true);
    });
  });
});
