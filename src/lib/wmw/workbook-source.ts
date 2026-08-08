/**
 * Read-only Workbook pull seam. Lab never writes back to Sheets (ADR 0009).
 */

import type { WmwWorkbookRaw, WmwWorkbookTab } from '@/lib/wmw/types';
import { WMW_WORKBOOK_TABS } from '@/lib/wmw/types';

export type WmwWorkbookSource = {
  /**
   * Pull the four frozen tabs as unformatted matrices
   * (numeric money + date serials). Must not mutate the Workbook.
   */
  pullTabs(): Promise<WmwWorkbookRaw>;
};

/** In-memory / fixture source for Vitest and local offline use. */
export function createFixtureWorkbookSource(
  raw: WmwWorkbookRaw,
): WmwWorkbookSource {
  return {
    async pullTabs() {
      return structuredClone(raw);
    },
  };
}

export type SheetsValuesBatchGetResponse = {
  valueRanges?: Array<{
    range?: string;
    values?: unknown[][];
  }>;
};

export type SheetsAccessTokenProvider = () => Promise<string>;

export type CreateGoogleSheetsWorkbookSourceOptions = {
  spreadsheetId: string;
  getAccessToken: SheetsAccessTokenProvider;
  /** Injected for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
};

/**
 * Live Google Sheets pull (read-only).
 * Requires spreadsheet ID + SA token from Amplify secrets (#181).
 * Requests UNFORMATTED_VALUE + SERIAL_NUMBER — never writes.
 *
 * TODO(#181): wire Amplify secret references for SA JSON + spreadsheet ID
 * (config hooks land with #182).
 */
export function createGoogleSheetsWorkbookSource(
  options: CreateGoogleSheetsWorkbookSourceOptions,
): WmwWorkbookSource {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async pullTabs() {
      if (!options.spreadsheetId.trim()) {
        throw new Error(
          'WMW spreadsheet ID is not configured (see #181 / #182 config).',
        );
      }

      const token = await options.getAccessToken();
      const params = new URLSearchParams({
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'SERIAL_NUMBER',
        majorDimension: 'ROWS',
      });
      for (const tab of WMW_WORKBOOK_TABS) {
        params.append('ranges', tab);
      }

      const url =
        `https://sheets.googleapis.com/v4/spreadsheets/` +
        `${encodeURIComponent(options.spreadsheetId)}/values:batchGet?` +
        params.toString();

      const response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `Sheets pull failed (${response.status}): ${body.slice(0, 200)}`,
        );
      }

      const json = (await response.json()) as SheetsValuesBatchGetResponse;
      return mapBatchGetToRaw(json);
    },
  };
}

function tabFromRange(range: string | undefined): WmwWorkbookTab | null {
  if (!range) return null;
  const tab = range.split('!')[0]?.replace(/^'|'$/g, '');
  if (!tab) return null;
  return (WMW_WORKBOOK_TABS as readonly string[]).includes(tab)
    ? (tab as WmwWorkbookTab)
    : null;
}

export function mapBatchGetToRaw(
  response: SheetsValuesBatchGetResponse,
): WmwWorkbookRaw {
  const raw = {
    dim_Accounts: [] as unknown[][],
    dim_Categories: [] as unknown[][],
    fact_Balances: [] as unknown[][],
    fact_Cashflows: [] as unknown[][],
  } satisfies WmwWorkbookRaw;

  for (const valueRange of response.valueRanges ?? []) {
    const tab = tabFromRange(valueRange.range);
    if (!tab) continue;
    raw[tab] = valueRange.values ?? [];
  }

  for (const tab of WMW_WORKBOOK_TABS) {
    if (!raw[tab].length) {
      throw new Error(`Sheets pull missing values for tab ${tab}`);
    }
  }

  return raw;
}
