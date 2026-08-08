/**
 * Default Amplify-backed WMW facade for client UI (lazy singleton).
 * Sheets SA wiring remains #181 — Refresh fails clearly until configured.
 */

import { createWmw, type WmwFacade } from '@/lib/wmw/facade';
import { getWmwConfig } from '@/lib/wmw/config';
import {
  createDefaultWmwSnapshotStore,
  createMemoryWmwSnapshotStore,
} from '@/lib/wmw/snapshot-store';
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

/**
 * Resolve workbook source. Live Sheets needs spreadsheet ID + token provider
 * (#181). Until then Refresh surfaces last-good + error in the Overview.
 */
export function resolveDefaultWorkbookSource(
  getAccessToken?: () => Promise<string>,
): WmwWorkbookSource {
  const config = getWmwConfig();
  if (config.spreadsheetId && getAccessToken) {
    return createGoogleSheetsWorkbookSource({
      spreadsheetId: config.spreadsheetId,
      getAccessToken,
    });
  }
  return createUnavailableWorkbookSource();
}

/** Default WMW for authenticated Overview (injectable in tests via props). */
export async function getDefaultWmw(options?: {
  getAccessToken?: () => Promise<string>;
}): Promise<WmwFacade> {
  if (!cached) {
    cached = (async () => {
      const store =
        (await createDefaultWmwSnapshotStore()) ??
        createMemoryWmwSnapshotStore();
      return createWmw({
        workbookSource: resolveDefaultWorkbookSource(options?.getAccessToken),
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
