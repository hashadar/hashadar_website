import { describe, expect, it, vi } from 'vitest';
import { createWmw } from '@/lib/wmw/facade';
import { createMemoryWmwSnapshotCache } from '@/lib/wmw/cache';
import { createSampleWorkbookRaw } from '@/lib/wmw/fixtures/sample-workbook';
import {
  createMemoryWmwSnapshotStore,
  createSnapshotStoreFromJsonStorage,
} from '@/lib/wmw/snapshot-store';
import {
  createFixtureWorkbookSource,
  createGoogleSheetsWorkbookSource,
  mapBatchGetToRaw,
} from '@/lib/wmw/workbook-source';
import type { WmwSnapshot } from '@/lib/wmw/types';

describe('WMW facade — Refresh and Snapshot', () => {
  it('refreshes from a fixture Workbook source into last-good storage', async () => {
    const store = createMemoryWmwSnapshotStore();
    const wmw = createWmw({
      workbookSource: createFixtureWorkbookSource(createSampleWorkbookRaw()),
      snapshotStore: store,
      now: () => new Date('2024-07-01T12:00:00.000Z'),
    });

    const { snapshot, warnings } = await wmw.refresh();

    expect(snapshot.asOf).toBe('2024-07-01T12:00:00.000Z');
    expect(snapshot.accounts.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.code === 'unknown_transaction_type')).toBe(
      true,
    );
    expect(await store.loadLatest()).toEqual(snapshot);
    expect(await wmw.getSnapshot()).toEqual(snapshot);
  });

  it('serves cached Snapshot until TTL expires, then reloads last-good', async () => {
    let nowMs = Date.parse('2024-07-01T12:00:00.000Z');
    const store = createMemoryWmwSnapshotStore();
    const cache = createMemoryWmwSnapshotCache({
      ttlMs: 60_000,
      now: () => nowMs,
    });
    const wmw = createWmw({
      workbookSource: createFixtureWorkbookSource(createSampleWorkbookRaw()),
      snapshotStore: store,
      cache,
      now: () => new Date(nowMs),
    });

    await wmw.refresh();
    const first = await wmw.getSnapshot();
    expect(first?.asOf).toBe('2024-07-01T12:00:00.000Z');

    await store.save({
      ...first!,
      asOf: '2099-01-01T00:00:00.000Z',
    });
    expect((await wmw.getSnapshot())?.asOf).toBe('2024-07-01T12:00:00.000Z');

    nowMs += 60_001;
    expect((await wmw.getSnapshot())?.asOf).toBe('2099-01-01T00:00:00.000Z');
  });

  it('manual Refresh busts the cache and re-pulls the Workbook', async () => {
    const firstRaw = createSampleWorkbookRaw();
    const secondRaw = createSampleWorkbookRaw();
    secondRaw.dim_Accounts = [
      ...firstRaw.dim_Accounts.slice(0, 2),
      ['ACC_NEW', 'New ISA', 'AJ Bell', 'CAT_BROKERAGE', 'GBP', ''],
    ];

    let raw = firstRaw;
    const source = {
      pullTabs: vi.fn(async () => structuredClone(raw)),
    };

    const wmw = createWmw({
      workbookSource: source,
      now: () => new Date('2024-07-01T12:00:00.000Z'),
    });

    await wmw.refresh();
    expect(
      (await wmw.getSnapshot())?.accounts.some((a) => a.accountId === 'ACC_NEW'),
    ).toBe(false);

    raw = secondRaw;
    await wmw.refresh();
    expect(source.pullTabs).toHaveBeenCalledTimes(2);
    expect(
      (await wmw.getSnapshot())?.accounts.some((a) => a.accountId === 'ACC_NEW'),
    ).toBe(true);
  });

  it('adapts #182-shaped JSON Snapshot storage without owning Amplify', async () => {
    type Stored = { snapshotJson: string; meta: { asOf: string } };
    let stored: Stored | null = null;
    const jsonStorage = {
      async putLastGoodSnapshot(input: {
        snapshotJson: string;
        asOf: string;
      }) {
        stored = {
          snapshotJson: input.snapshotJson,
          meta: { asOf: input.asOf },
        };
      },
      async getLastGoodSnapshot(): Promise<Stored | null> {
        return stored;
      },
    };

    const wmw = createWmw({
      workbookSource: createFixtureWorkbookSource(createSampleWorkbookRaw()),
      snapshotStore: createSnapshotStoreFromJsonStorage(jsonStorage),
      now: () => new Date('2024-07-01T12:00:00.000Z'),
    });

    await wmw.refresh();
    const loaded = await wmw.getSnapshot();
    expect(loaded?.asOf).toBe('2024-07-01T12:00:00.000Z');
    expect(stored).not.toBeNull();
    expect(stored!.meta.asOf).toBe('2024-07-01T12:00:00.000Z');
    const parsed = JSON.parse(stored!.snapshotJson) as WmwSnapshot;
    expect(parsed.accounts[0]?.accountId).toBe('ACC_ISA');
  });

  it('does not expose a write path on the Workbook source', () => {
    const source = createFixtureWorkbookSource(createSampleWorkbookRaw());
    expect(Object.keys(source)).toEqual(['pullTabs']);
  });
});

describe('Google Sheets workbook source (read-only pull)', () => {
  it('requests unformatted values and maps batchGet ranges into tab matrices', async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).toContain('valueRenderOption=UNFORMATTED_VALUE');
      expect(url).toContain('dateTimeRenderOption=SERIAL_NUMBER');
      expect(url).toContain('ranges=dim_Accounts');
      expect(url).not.toMatch(/values:batchUpdate|spreadsheets\.values\.update/i);
      expect(init?.method).toBe('GET');
      expect(init?.headers).toMatchObject({
        Authorization: 'Bearer test-token',
      });

      return new Response(
        JSON.stringify({
          valueRanges: [
            {
              range: 'dim_Accounts!A1:F2',
              values: [
                [
                  'Account_ID',
                  'Account_Name',
                  'Platform',
                  'Category_ID',
                  'Currency',
                  'Pair_ID',
                ],
                ['ACC_ISA', 'ISA', 'AJ Bell', 'CAT_BROKERAGE', 'GBP', ''],
              ],
            },
            {
              range: 'dim_Categories!A1:D2',
              values: [
                ['Category_ID', 'Type', 'Class', 'Sign'],
                ['CAT_BROKERAGE', 'Asset', 'Investments', 1],
              ],
            },
            {
              range: 'fact_Balances!A1:E2',
              values: [
                ['Date', 'Account_ID', 'Balance', 'Units', 'Mileage'],
                [45306, 'ACC_ISA', 10000, '', ''],
              ],
            },
            {
              range: 'fact_Cashflows!A1:E2',
              values: [
                [
                  'Date',
                  'Account_ID',
                  'Amount',
                  'Transaction_Type',
                  'Description',
                ],
                [45306, 'ACC_ISA', 1000, 'Contribution', 'Top-up'],
              ],
            },
          ],
        }),
        { status: 200 },
      );
    },
    );

    const source = createGoogleSheetsWorkbookSource({
      spreadsheetId: 'sheet-id-for-tests-only',
      getAccessToken: async () => 'test-token',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const raw = await source.pullTabs();
    expect(raw.dim_Accounts[1]?.[0]).toBe('ACC_ISA');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('mapBatchGetToRaw requires all four frozen tabs', () => {
    expect(() =>
      mapBatchGetToRaw({
        valueRanges: [{ range: 'dim_Accounts', values: [['Account_ID']] }],
      }),
    ).toThrow(/missing values for tab/);
  });
});
