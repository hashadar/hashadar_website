import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  createGoogleSaAccessTokenProvider,
  createGoogleSaJwtAssertion,
} from '@/lib/wmw/google-sa-access-token';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const credentials = {
  clientEmail: 'wmw-reader@example.iam.gserviceaccount.com',
  privateKey,
};

describe('createGoogleSaJwtAssertion', () => {
  it('builds a three-part RS256 JWT', () => {
    const jwt = createGoogleSaJwtAssertion(credentials, {
      nowSeconds: () => 1_700_000_000,
    });
    const parts = jwt.split('.');
    expect(parts).toHaveLength(3);
    const payload = JSON.parse(
      Buffer.from(parts[1]!, 'base64url').toString('utf8'),
    ) as { iss: string; scope: string; aud: string };
    expect(payload.iss).toBe(credentials.clientEmail);
    expect(payload.scope).toContain('spreadsheets.readonly');
    expect(payload.aud).toBe('https://oauth2.googleapis.com/token');
  });
});

describe('createGoogleSaAccessTokenProvider', () => {
  it('exchanges a JWT assertion for an access token', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ access_token: 'ya29.test-token', expires_in: 3600 }),
    );

    const getToken = createGoogleSaAccessTokenProvider({
      credentials,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      nowSeconds: () => 1_700_000_000,
    });

    await expect(getToken()).resolves.toBe('ya29.test-token');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(init.body)).toContain('grant_type=');
  });

  it('caches tokens until near expiry', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ access_token: 'ya29.cached', expires_in: 3600 }),
    );
    const getToken = createGoogleSaAccessTokenProvider({
      credentials,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(getToken()).resolves.toBe('ya29.cached');
    await expect(getToken()).resolves.toBe('ya29.cached');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
