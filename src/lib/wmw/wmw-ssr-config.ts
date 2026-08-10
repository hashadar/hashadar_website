/**
 * Non-secret WMW SSR config available to Server Actions.
 * Amplify build overwrites these fields via write-amplify-ssr-env.ts
 * (`AWS_APP_ID`, region, spreadsheet ID, secret leaf name).
 * Google SA JSON is fetched at runtime from SSM (compute role) — not stored here.
 * See docs/wmw/snapshot-storage.md for the recommended shared Hosting secret path.
 */
import 'server-only';

export type WmwSsrConfig = {
  /** Amplify app id (SSM path prefix). */
  appId: string;
  /** AWS region for SSM. */
  region: string;
  /** Equity Workbook spreadsheet ID (non-secret). */
  spreadsheetId: string | null;
  /** Hosting secret leaf name under /amplify/shared/{appId}/. */
  googleSaSecretName: string;
};

/**
 * Local/CI defaults when write-amplify-ssr-env has not run.
 * Amplify build overwrites `appId` from `AWS_APP_ID` — do not treat this as the
 * documented SSM path; use `/amplify/shared/{appId}/{secretName}` placeholders.
 */
export const wmwSsrConfig: WmwSsrConfig = {
  appId: 'd3j7dgxx3prj17',
  region: 'eu-west-2',
  spreadsheetId: null,
  googleSaSecretName: 'wmw.google-service-account',
};
