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
    expect(view.accountNames.get('CAR_PORSCHE')).toBe('Porsche Taycan 4S');
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

  describe('Net basis (default)', () => {
    it('defaults to net and shows the Taycan as one position', () => {
      const view = buildWmwOverviewView(buildSampleSnapshot());

      expect(view.basis).toBe('net');
      expect(view.kpis?.netWorth.total).toBe(53_000);
      expect(view.accountRows.map((r) => r.accountName).sort()).toEqual([
        'Coinbase ETH',
        'IBKR ISA',
        'Porsche Taycan 4S',
      ]);

      const taycan = view.accountRows.find(
        (r) => r.accountId === 'CAR_PORSCHE',
      )!;
      expect(taycan.contribution).toBe(30_000);
      expect(taycan.pctOfNetWorth).toBeCloseTo(30_000 / 53_000, 6);
      expect(taycan.momDelta).toBe(0);
      expect(taycan.pairLegs.map((l) => l.accountId)).toEqual([
        'CAR_PORSCHE',
        'LOAN_MOTONOVO',
      ]);
    });

    it('folds the loan into Cars and drops the Loans Class row', () => {
      const view = buildWmwOverviewView(buildSampleSnapshot());

      const byClass = Object.fromEntries(
        view.classRows.map((r) => [r.class, r.contribution]),
      );
      expect(byClass['Cars']).toBe(30_000);
      expect(byClass['Loans']).toBeUndefined();

      const latestMix = view.classHistory[view.classHistory.length - 1]!;
      expect(latestMix.byClass.find((r) => r.class === 'Cars')?.contribution).toBe(
        30_000,
      );
      expect(latestMix.byClass.some((r) => r.class === 'Loans')).toBe(false);
    });

    it('finds the position by either leg name or Account ID', () => {
      const snapshot = buildSampleSnapshot();
      for (const accountQuery of ['porsche', 'motonovo', 'LOAN_MOTONOVO']) {
        const view = buildWmwOverviewView(snapshot, { accountQuery });
        expect(view.accountRows.map((r) => r.accountId)).toEqual([
          'CAR_PORSCHE',
        ]);
      }
    });

    it('computes MoM on the position (net to net)', () => {
      const view = buildWmwOverviewView(buildSampleSnapshot(), {
        selectedMonth: '2026-02',
      });
      const taycan = view.accountRows.find((r) => r.accountId === 'CAR_PORSCHE')!;
      // Feb 78k - 48k = 30k; Jan 80k - 50k = 30k
      expect(taycan.contribution).toBe(30_000);
      expect(taycan.momDelta).toBe(0);
    });

    it('leaves unpaired Accounts without legs', () => {
      const view = buildWmwOverviewView(buildSampleSnapshot());
      expect(
        view.accountRows.find((r) => r.accountId === 'IBKR_ISA')?.pairLegs,
      ).toEqual([]);
    });
  });

  describe('Gross basis', () => {
    it('reproduces the Account-level rows and Classes', () => {
      const view = buildWmwOverviewView(buildSampleSnapshot(), {
        basis: 'gross',
      });

      expect(view.basis).toBe('gross');
      expect(view.accountRows.map((r) => r.accountId).sort()).toEqual([
        'CAR_PORSCHE',
        'CB_ETH',
        'IBKR_ISA',
        'LOAN_MOTONOVO',
      ]);
      const byClass = Object.fromEntries(
        view.classRows.map((r) => [r.class, r.contribution]),
      );
      expect(byClass['Cars']).toBe(77_000);
      expect(byClass['Loans']).toBe(-47_000);
      expect(view.accountRows.every((r) => r.pairLegs.length === 0)).toBe(true);
    });

    it('matches the Net Worth totals and KPIs in both bases', () => {
      const snapshot = buildSampleSnapshot();
      const net = buildWmwOverviewView(snapshot, { basis: 'net' });
      const gross = buildWmwOverviewView(snapshot, { basis: 'gross' });

      expect(net.kpis).toEqual(gross.kpis);
      expect(net.history).toEqual(gross.history);
      expect(net.headline).toEqual(gross.headline);
      expect(
        net.classRows.reduce((sum, r) => sum + r.contribution, 0),
      ).toBe(gross.classRows.reduce((sum, r) => sum + r.contribution, 0));
    });

    it('does not match the loan name to anything but the loan row', () => {
      const view = buildWmwOverviewView(buildSampleSnapshot(), {
        basis: 'gross',
        accountQuery: 'motonovo',
      });
      expect(view.accountRows.map((r) => r.accountId)).toEqual([
        'LOAN_MOTONOVO',
      ]);
    });
  });
});