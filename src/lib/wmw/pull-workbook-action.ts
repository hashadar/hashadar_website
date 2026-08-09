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
import { resolveGoogleServiceAccountCredentialsAsync } from '@/lib/wmw/google-sa-credentials';
import type { WmwWorkbookRaw } from '@/lib/wmw/types';
import { createGoogleSheetsWorkbookSource } from '@/lib/wmw/workbook-source';
import { wmwSsrConfig } from '@/lib/wmw/wmw-ssr-config';

/**
 * Pull the four frozen Workbook tabs via Sheets (unformatted values).
 * Called from the client facade Refresh path as a Server Action.
 * Production: spreadsheet ID from build-written `wmwSsrConfig`; SA JSON from SSM.
 */
export async function pullWmwWorkbookTabs(): Promise<WmwWorkbookRaw> {
  const config = getWmwConfig();
  const spreadsheetId =
    wmwSsrConfig.spreadsheetId?.trim() || config.spreadsheetId;
  const credentials = await resolveGoogleServiceAccountCredentialsAsync();

  if (!spreadsheetId || !credentials) {
    throw new Error(WMW_WORKBOOK_NOT_CONFIGURED_REASON);
  }

  const source = createGoogleSheetsWorkbookSource({
    spreadsheetId,
    getAccessToken: createGoogleSaAccessTokenProvider({ credentials }),
  });

  return source.pullTabs();
}
