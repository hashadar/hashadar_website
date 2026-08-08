import { describe, expect, it } from 'vitest';
import { parseWorkbook } from '@/lib/wmw/parse-workbook';
import {
  createSampleWorkbookRaw,
  createWorkbookMissingBalanceColumn,
  SERIAL_2024_01_15,
} from '@/lib/wmw/fixtures/sample-workbook';

describe('parseWorkbook', () => {
  it('normalises unformatted sample tabs into a Snapshot payload', () => {
    const result = parseWorkbook({
      raw: createSampleWorkbookRaw(),
      asOf: '2024-07-01T12:00:00.000Z',
    });

    expect(result.asOf).toBe('2024-07-01T12:00:00.000Z');
    expect(result.accounts.map((a) => a.accountId)).toEqual([
      'ACC_ISA',
      'ACC_SIPP',
      'ACC_CASH',
      'ACC_CAR',
      'ACC_CAR_LOAN',
    ]);
    expect(result.accounts.find((a) => a.accountId === 'ACC_CAR')).toMatchObject(
      {
        pairId: 'PAIR_TAYCAN',
        currency: 'GBP',
      },
    );
    expect(result.accounts.find((a) => a.accountId === 'ACC_ISA')?.pairId).toBe(
      null,
    );

    expect(result.balances).toContainEqual({
      date: '2024-01-15',
      accountId: 'ACC_ISA',
      balance: 10000,
      units: null,
      mileage: null,
    });
    expect(
      result.balances.find(
        (b) => b.accountId === 'ACC_CAR' && b.date === '2024-02-01',
      ),
    ).toMatchObject({ mileage: 12000 });

    expect(result.cashflows.map((c) => c.transactionType).sort()).toEqual([
      'Contribution',
      'Loan Repayment',
      'Withdrawal',
    ]);
  });

  it('excludes non-GBP Accounts and related facts with a warning', () => {
    const result = parseWorkbook({
      raw: createSampleWorkbookRaw(),
      asOf: '2024-07-01T12:00:00.000Z',
    });

    expect(result.accounts.some((a) => a.accountId === 'ACC_USD')).toBe(false);
    expect(result.balances.some((b) => b.accountId === 'ACC_USD')).toBe(false);
    expect(
      result.warnings.some(
        (w) =>
          w.code === 'non_gbp_account' && w.details?.accountId === 'ACC_USD',
      ),
    ).toBe(true);
    expect(
      result.warnings.some(
        (w) => w.code === 'orphan_fact' && w.details?.accountId === 'ACC_USD',
      ),
    ).toBe(true);
  });

  it('excludes unknown Transaction_Type from cashflows and warns for Refresh', () => {
    const result = parseWorkbook({
      raw: createSampleWorkbookRaw(),
      asOf: '2024-07-01T12:00:00.000Z',
    });

    expect(
      result.cashflows.some((c) => (c.transactionType as string) === 'Transfer'),
    ).toBe(false);
    const unknown = result.warnings.filter(
      (w) => w.code === 'unknown_transaction_type',
    );
    expect(unknown).toHaveLength(2);
    expect(unknown.map((w) => w.details?.transactionType).sort()).toEqual([
      'Dividend',
      'Transfer',
    ]);
  });

  it('rejects tabs that break the frozen column contract', () => {
    expect(() =>
      parseWorkbook({
        raw: createWorkbookMissingBalanceColumn(),
        asOf: '2024-07-01T12:00:00.000Z',
      }),
    ).toThrow(/fact_Balances: missing required column "Balance"/);
  });

  it('maps header names rather than relying on column order', () => {
    const raw = createSampleWorkbookRaw();
    raw.fact_Balances = [
      ['Units', 'Mileage', 'Balance', 'Account_ID', 'Date'],
      ['', '', 42, 'ACC_ISA', SERIAL_2024_01_15],
    ];

    const result = parseWorkbook({
      raw,
      asOf: '2024-07-01T12:00:00.000Z',
    });

    expect(result.balances).toContainEqual({
      date: '2024-01-15',
      accountId: 'ACC_ISA',
      balance: 42,
      units: null,
      mileage: null,
    });
  });
});
