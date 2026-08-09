/**
 * Non-secret WMW SSR config available to Server Actions.
 * Amplify build overwrites spreadsheet fields via write-amplify-ssr-env.ts.
 * Google SA JSON is fetched at runtime from SSM (compute role) — not stored here.
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

/** Defaults for production Amplify app; spreadsheetId filled at Amplify build. */
export const wmwSsrConfig: WmwSsrConfig = {
  appId: 'd3j7dgxx3prj17',
  region: 'eu-west-2',
  spreadsheetId: null,
  googleSaSecretName: 'wmw.google-service-account',
};
