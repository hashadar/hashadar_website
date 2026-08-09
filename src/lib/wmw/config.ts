/**
 * WMW app config from environment.
 * Spreadsheet ID + SA secret name (#181). SA JSON itself is resolved server-side
 * via `resolveGoogleServiceAccountCredentialsAsync` (never NEXT_PUBLIC_).
 *
 * Production spreadsheet ID is injected into `wmw-ssr-config.ts` at Amplify build
 * (see write-amplify-ssr-env) and read from the Server Action — not from here —
 * because Amplify SSR compute does not receive `.env.production` at runtime.
 */
export type WmwConfig = {
  spreadsheetId: string | null;
  /** Host/Amplify secret name that holds the Google service account JSON. */
  googleServiceAccountSecretName: string | null;
};

export const WMW_SPREADSHEET_ID_ENV = 'WMW_SPREADSHEET_ID';
export const WMW_GOOGLE_SA_SECRET_NAME_ENV = 'WMW_GOOGLE_SA_SECRET_NAME';

/** Default Amplify secret name in `.env.example` (not a credential). Must match `[a-zA-Z0-9_.-]+`. */
export const WMW_GOOGLE_SA_SECRET_NAME_PLACEHOLDER = 'wmw.google-service-account';

/** Shared error copy when spreadsheet ID / SA credentials are missing (#181). */
export const WMW_WORKBOOK_NOT_CONFIGURED_REASON =
  'WMW Workbook source is not configured (see #181). Set WMW_SPREADSHEET_ID and WMW_GOOGLE_SERVICE_ACCOUNT_JSON (or FILE / Amplify secrets + SSR compute role).';

type EnvLike = Record<string, string | undefined>;

function readTrimmed(env: EnvLike, key: string): string | null {
  const value = env[key]?.trim();
  return value ? value : null;
}

/** Local `.env.local` / test reads. */
export function readWmwConfigProcessEnv(): EnvLike {
  return {
    WMW_SPREADSHEET_ID: process.env.WMW_SPREADSHEET_ID,
    WMW_GOOGLE_SA_SECRET_NAME: process.env.WMW_GOOGLE_SA_SECRET_NAME,
  };
}

export function getWmwConfig(env: EnvLike = readWmwConfigProcessEnv()): WmwConfig {
  return {
    spreadsheetId: readTrimmed(env, WMW_SPREADSHEET_ID_ENV),
    googleServiceAccountSecretName: readTrimmed(
      env,
      WMW_GOOGLE_SA_SECRET_NAME_ENV,
    ),
  };
}
