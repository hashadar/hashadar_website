/**
 * Resolve Google service-account JSON for server-side Sheets pulls.
 * Never import this from client components — private key must stay on the server.
 */

import 'server-only';
import { readFileSync } from 'node:fs';
import {
  WMW_GOOGLE_SA_SECRET_NAME_ENV,
  WMW_GOOGLE_SA_SECRET_NAME_PLACEHOLDER,
} from '@/lib/wmw/config';

export const WMW_GOOGLE_SERVICE_ACCOUNT_JSON_ENV =
  'WMW_GOOGLE_SERVICE_ACCOUNT_JSON';
export const WMW_GOOGLE_SERVICE_ACCOUNT_FILE_ENV =
  'WMW_GOOGLE_SERVICE_ACCOUNT_FILE';

/** Amplify Hosting injects branch secrets as a JSON map under this env key. */
export const AMPLIFY_SECRETS_ENV = 'secrets';

export const WMW_SHEETS_READONLY_SCOPE =
  'https://www.googleapis.com/auth/spreadsheets.readonly';

export type GoogleServiceAccountCredentials = {
  clientEmail: string;
  privateKey: string;
};

type EnvLike = Record<string, string | undefined>;

export function parseGoogleServiceAccountJson(
  raw: string,
): GoogleServiceAccountCredentials {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('WMW Google service account JSON is not valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('WMW Google service account JSON must be an object.');
  }

  const record = parsed as Record<string, unknown>;
  const clientEmail =
    typeof record.client_email === 'string' ? record.client_email.trim() : '';
  const privateKey =
    typeof record.private_key === 'string' ? record.private_key : '';

  if (!clientEmail || !privateKey.includes('BEGIN PRIVATE KEY')) {
    throw new Error(
      'WMW Google service account JSON must include client_email and private_key.',
    );
  }

  return {
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}

function readAmplifySecretsMap(env: EnvLike): Record<string, string> {
  const raw = env[AMPLIFY_SECRETS_ENV]?.trim();
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.trim()) {
        out[key] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Static `process.env.*` reads so Next can inline Amplify `.env.production`
 * values into Server Actions (dynamic `process.env[key]` is not inlined).
 */
export function readGoogleSaProcessEnv(): EnvLike {
  return {
    WMW_GOOGLE_SERVICE_ACCOUNT_JSON: process.env.WMW_GOOGLE_SERVICE_ACCOUNT_JSON,
    WMW_GOOGLE_SERVICE_ACCOUNT_FILE: process.env.WMW_GOOGLE_SERVICE_ACCOUNT_FILE,
    WMW_GOOGLE_SA_SECRET_NAME: process.env.WMW_GOOGLE_SA_SECRET_NAME,
    secrets: process.env.secrets,
  };
}

/**
 * Resolution order (first hit wins):
 * 1. `WMW_GOOGLE_SERVICE_ACCOUNT_JSON` — raw JSON (local `.env.local` / Amplify SSR)
 * 2. `WMW_GOOGLE_SERVICE_ACCOUNT_FILE` — path to JSON file
 * 3. Amplify Hosting `process.env.secrets[WMW_GOOGLE_SA_SECRET_NAME]`
 */
export function resolveGoogleServiceAccountCredentials(
  env: EnvLike = readGoogleSaProcessEnv(),
): GoogleServiceAccountCredentials | null {
  const inline = env[WMW_GOOGLE_SERVICE_ACCOUNT_JSON_ENV]?.trim();
  if (inline) {
    return parseGoogleServiceAccountJson(inline);
  }

  const filePath = env[WMW_GOOGLE_SERVICE_ACCOUNT_FILE_ENV]?.trim();
  if (filePath) {
    return parseGoogleServiceAccountJson(readFileSync(filePath, 'utf8'));
  }

  const secretName =
    env[WMW_GOOGLE_SA_SECRET_NAME_ENV]?.trim() ||
    WMW_GOOGLE_SA_SECRET_NAME_PLACEHOLDER;
  const fromAmplify = readAmplifySecretsMap(env)[secretName]?.trim();
  if (fromAmplify) {
    return parseGoogleServiceAccountJson(fromAmplify);
  }

  return null;
}
