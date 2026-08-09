import { describe, expect, it } from 'vitest';
import {
  AMPLIFY_SECRETS_ENV,
  parseGoogleServiceAccountJson,
  resolveGoogleServiceAccountCredentials,
  WMW_GOOGLE_SERVICE_ACCOUNT_JSON_ENV,
} from '@/lib/wmw/google-sa-credentials';
import {
  WMW_GOOGLE_SA_SECRET_NAME_ENV,
  WMW_GOOGLE_SA_SECRET_NAME_PLACEHOLDER,
} from '@/lib/wmw/config';

const SAMPLE_JSON = JSON.stringify({
  type: 'service_account',
  client_email: 'wmw-reader@example.iam.gserviceaccount.com',
  private_key:
    '-----BEGIN PRIVATE KEY-----\\nMIIE\\n-----END PRIVATE KEY-----\\n',
});

describe('parseGoogleServiceAccountJson', () => {
  it('parses client_email and unescapes private_key newlines', () => {
    expect(parseGoogleServiceAccountJson(SAMPLE_JSON)).toEqual({
      clientEmail: 'wmw-reader@example.iam.gserviceaccount.com',
      privateKey:
        '-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n',
    });
  });

  it('rejects invalid JSON', () => {
    expect(() => parseGoogleServiceAccountJson('{')).toThrow(/not valid JSON/i);
  });

  it('rejects missing key fields', () => {
    expect(() =>
      parseGoogleServiceAccountJson(JSON.stringify({ client_email: 'a@b.c' })),
    ).toThrow(/client_email and private_key/i);
  });
});

describe('resolveGoogleServiceAccountCredentials', () => {
  it('returns null when nothing is configured', () => {
    expect(resolveGoogleServiceAccountCredentials({})).toBeNull();
  });

  it('prefers inline JSON env', () => {
    expect(
      resolveGoogleServiceAccountCredentials({
        [WMW_GOOGLE_SERVICE_ACCOUNT_JSON_ENV]: SAMPLE_JSON,
        [AMPLIFY_SECRETS_ENV]: JSON.stringify({
          [WMW_GOOGLE_SA_SECRET_NAME_PLACEHOLDER]: SAMPLE_JSON,
        }),
      }),
    ).toMatchObject({
      clientEmail: 'wmw-reader@example.iam.gserviceaccount.com',
    });
  });

  it('reads Amplify Hosting secrets map by configured name', () => {
    expect(
      resolveGoogleServiceAccountCredentials({
        [WMW_GOOGLE_SA_SECRET_NAME_ENV]: 'wmw.google-service-account',
        [AMPLIFY_SECRETS_ENV]: JSON.stringify({
          'wmw.google-service-account': SAMPLE_JSON,
        }),
      }),
    ).toMatchObject({
      clientEmail: 'wmw-reader@example.iam.gserviceaccount.com',
    });
  });
});
