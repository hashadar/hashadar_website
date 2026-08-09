'use server';

/**
 * Server-only Workbook pull. Keeps the Google SA private key off the browser.
 * This file may only export async Server Actions.
 */

import {
  getWmwConfig,
  WMW_WORKBOOK_NOT_CONFIGURED_REASON,
} from '@/lib/wmw/config';
import { createGoogleSaAccessTokenProvider } from '@/lib/wmw/google-sa-access-token';
import { resolveGoogleServiceAccountCredentials } from '@/lib/wmw/google-sa-credentials';
import type { WmwWorkbookRaw } from '@/lib/wmw/types';
import { createGoogleSheetsWorkbookSource } from '@/lib/wmw/workbook-source';

/**
 * Pull the four frozen Workbook tabs via Sheets (unformatted values).
 * Called from the client facade Refresh path as a Server Action.
 */
export async function pullWmwWorkbookTabs(): Promise<WmwWorkbookRaw> {
  const config = getWmwConfig();
  const credentials = resolveGoogleServiceAccountCredentials();

  if (!config.spreadsheetId || !credentials) {
    throw new Error(WMW_WORKBOOK_NOT_CONFIGURED_REASON);
  }

  const source = createGoogleSheetsWorkbookSource({
    spreadsheetId: config.spreadsheetId,
    getAccessToken: createGoogleSaAccessTokenProvider({ credentials }),
  });

  return source.pullTabs();
}
