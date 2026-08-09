/**
 * Default Amplify-backed WMW facade for client UI (lazy singleton).
 * Live Sheets pulls go through a Server Action so the SA key never hits the browser.
 */

import { createWmw, type WmwFacade } from '@/lib/wmw/facade';
import { getWmwConfig } from '@/lib/wmw/config';
import { pullWmwWorkbookTabs } from '@/lib/wmw/pull-workbook-action';
import {
  createDefaultWmwSnapshotStore,
  createMemoryWmwSnapshotStore,
} from '@/lib/wmw/snapshot-store';
import type { WmwWorkbookRaw } from '@/lib/wmw/types';
import type { WmwWorkbookSource } from '@/lib/wmw/workbook-source';
import { createGoogleSheetsWorkbookSource } from '@/lib/wmw/workbook-source';

let cached: Promise<WmwFacade> | null = null;

/** Workbook pull that fails with a clear message (no live Sheets in CI). */
export function createUnavailableWorkbookSource(
  message = 'WMW Workbook source is not configured (see #181).',
): WmwWorkbookSource {
  return {
    async pullTabs() {
      throw new Error(message);
    },
  };
}

/** Client-safe source that delegates the Sheets pull to a Server Action. */
export function createServerPullWorkbookSource(
  pullTabs: () => Promise<WmwWorkbookRaw> = () => pullWmwWorkbookTabs(),
): WmwWorkbookSource {
  return {
    async pullTabs() {
      return pullTabs();
    },
  };
}

export type ResolveDefaultWorkbookSourceOptions = {
  /**
   * Test/offline override: provide a token provider with spreadsheet ID in env
   * to exercise the in-process Sheets client (never used by the Overview UI).
   */
  getAccessToken?: () => Promise<string>;
  /** Test override for the Server Action pull. */
  pullTabs?: () => Promise<WmwWorkbookRaw>;
};

/**
 * Resolve workbook source. Production UI uses the Server Action path so SA JSON
 * stays server-side. Optional `getAccessToken` remains for direct Sheets tests.
 */
export function resolveDefaultWorkbookSource(
  options?: ResolveDefaultWorkbookSourceOptions,
): WmwWorkbookSource {
  if (options?.pullTabs) {
    return createServerPullWorkbookSource(options.pullTabs);
  }

  const config = getWmwConfig();
  if (config.spreadsheetId && options?.getAccessToken) {
    return createGoogleSheetsWorkbookSource({
      spreadsheetId: config.spreadsheetId,
      getAccessToken: options.getAccessToken,
    });
  }

  // Overview / Account detail: always delegate to the server pull.
  return createServerPullWorkbookSource();
}

/** Default WMW for authenticated Overview (injectable in tests via props). */
export async function getDefaultWmw(options?: {
  getAccessToken?: () => Promise<string>;
  pullTabs?: () => Promise<WmwWorkbookRaw>;
}): Promise<WmwFacade> {
  if (!cached) {
    cached = (async () => {
      const store =
        (await createDefaultWmwSnapshotStore()) ??
        createMemoryWmwSnapshotStore();
      return createWmw({
        workbookSource: resolveDefaultWorkbookSource(options),
        snapshotStore: store,
      });
    })();
  }
  return cached;
}

/** Test helper — clear the singleton between Vitest cases. */
export function resetDefaultWmwCache(): void {
  cached = null;
}
