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
});
