/**
 * WMW app config from environment.
 * Spreadsheet ID and SA secret values are supplied in #181; placeholders are fine until then.
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

type EnvLike = Record<string, string | undefined>;

function readTrimmed(env: EnvLike, key: string): string | null {
  const value = env[key]?.trim();
  return value ? value : null;
}

export function getWmwConfig(env: EnvLike = process.env): WmwConfig {
  return {
    spreadsheetId: readTrimmed(env, WMW_SPREADSHEET_ID_ENV),
    googleServiceAccountSecretName: readTrimmed(
      env,
      WMW_GOOGLE_SA_SECRET_NAME_ENV,
    ),
  };
}
