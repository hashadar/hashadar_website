/**
 * Mint a Google OAuth access token from a service-account private key (JWT bearer).
 * Server-only — do not call from the browser.
 */

import 'server-only';
import { createSign } from 'node:crypto';
import type { GoogleServiceAccountCredentials } from '@/lib/wmw/google-sa-credentials';
import { WMW_SHEETS_READONLY_SCOPE } from '@/lib/wmw/google-sa-credentials';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TOKEN_LIFETIME_SECONDS = 3600;

export type CreateGoogleSaAccessTokenProviderOptions = {
  credentials: GoogleServiceAccountCredentials;
  scope?: string;
  fetchImpl?: typeof fetch;
  /** Injected clock for tests (unix seconds). */
  nowSeconds?: () => number;
};

function base64UrlEncode(input: Buffer | string): string {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function signJwtRs256(
  unsignedToken: string,
  privateKey: string,
): string {
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  return base64UrlEncode(signer.sign(privateKey));
}

export function createGoogleSaJwtAssertion(
  credentials: GoogleServiceAccountCredentials,
  options?: {
    scope?: string;
    nowSeconds?: () => number;
    lifetimeSeconds?: number;
  },
): string {
  const now = options?.nowSeconds?.() ?? Math.floor(Date.now() / 1000);
  const lifetime = options?.lifetimeSeconds ?? TOKEN_LIFETIME_SECONDS;
  const header = base64UrlEncode(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
  );
  const claimSet = base64UrlEncode(
    JSON.stringify({
      iss: credentials.clientEmail,
      scope: options?.scope ?? WMW_SHEETS_READONLY_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + lifetime,
    }),
  );
  const unsigned = `${header}.${claimSet}`;
  return `${unsigned}.${signJwtRs256(unsigned, credentials.privateKey)}`;
}

export function createGoogleSaAccessTokenProvider(
  options: CreateGoogleSaAccessTokenProviderOptions,
): () => Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  let cached: { token: string; expiresAtMs: number } | null = null;

  return async () => {
    const nowMs = Date.now();
    if (cached && cached.expiresAtMs > nowMs + 60_000) {
      return cached.token;
    }

    const assertion = createGoogleSaJwtAssertion(options.credentials, {
      scope: options.scope,
      nowSeconds: options.nowSeconds,
    });

    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    });

    const response = await fetchImpl(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Google SA token exchange failed (${response.status}): ${text.slice(0, 200)}`,
      );
    }

    const json = (await response.json()) as {
      access_token?: unknown;
      expires_in?: unknown;
    };
    if (typeof json.access_token !== 'string' || !json.access_token) {
      throw new Error('Google SA token exchange returned no access_token.');
    }

    const expiresInSeconds =
      typeof json.expires_in === 'number' && json.expires_in > 0
        ? json.expires_in
        : TOKEN_LIFETIME_SECONDS;
    cached = {
      token: json.access_token,
      expiresAtMs: nowMs + expiresInSeconds * 1000,
    };
    return cached.token;
  };
}
