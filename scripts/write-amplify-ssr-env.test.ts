import { describe, expect, it, vi } from 'vitest';
import {
  amplifyBranchSecretParamName,
  amplifySharedSecretParamName,
  buildAmplifySsrEnvLines,
  ensureWmwSecretInAmplifySecretsEnv,
  flattenWmwServiceAccountJsonEnv,
  parseAmplifySecretsMap,
} from './write-amplify-ssr-env';

describe('buildAmplifySsrEnvLines', () => {
  it('writes present keys as JSON-stringified dotenv lines', () => {
    const secrets = JSON.stringify({
      'wmw.google-service-account': '{"type":"service_account"}',
    });
    const saJson = '{"type":"service_account"}';
    const lines = buildAmplifySsrEnvLines({
      WMW_SPREADSHEET_ID: 'sheet-id',
      WMW_GOOGLE_SA_SECRET_NAME: 'wmw.google-service-account',
      WMW_GOOGLE_SERVICE_ACCOUNT_JSON: saJson,
      secrets,
    });

    expect(lines).toEqual([
      'WMW_SPREADSHEET_ID="sheet-id"',
      'WMW_GOOGLE_SA_SECRET_NAME="wmw.google-service-account"',
      `WMW_GOOGLE_SERVICE_ACCOUNT_JSON=${JSON.stringify(saJson)}`,
      `secrets=${JSON.stringify(secrets)}`,
    ]);
  });

  it('skips missing or empty values', () => {
    expect(
      buildAmplifySsrEnvLines({
        WMW_SPREADSHEET_ID: '',
        WMW_GOOGLE_SA_SECRET_NAME: undefined,
      }),
    ).toEqual([]);
  });

  it('round-trips secrets JSON through JSON.parse of the dotenv value', () => {
    const secrets = JSON.stringify({
      'wmw.google-service-account': '{"client_email":"a@b.com"}',
    });
    const [line] = buildAmplifySsrEnvLines({ secrets }, ['secrets']);
    const valueLiteral = line.slice('secrets='.length);
    expect(JSON.parse(valueLiteral)).toBe(secrets);
    expect(JSON.parse(JSON.parse(valueLiteral))).toEqual({
      'wmw.google-service-account': '{"client_email":"a@b.com"}',
    });
  });
});

describe('ensureWmwSecretInAmplifySecretsEnv', () => {
  const saJson = JSON.stringify({
    type: 'service_account',
    client_email: 'wmw-reader@example.iam.gserviceaccount.com',
    private_key:
      '-----BEGIN PRIVATE KEY-----\\nMIIE\\n-----END PRIVATE KEY-----\\n',
  });

  it('leaves secrets untouched when the named leaf is already present', () => {
    const secrets = JSON.stringify({
      'wmw.google-service-account': saJson,
    });
    const fetchParameter = vi.fn();
    const result = ensureWmwSecretInAmplifySecretsEnv(
      {
        WMW_GOOGLE_SA_SECRET_NAME: 'wmw.google-service-account',
        secrets,
        AWS_APP_ID: 'd3j7dgxx3prj17',
        AWS_BRANCH: 'main',
      },
      { fetchParameter },
    );

    expect(result.seededFrom).toBeNull();
    expect(result.env.secrets).toBe(secrets);
    expect(fetchParameter).not.toHaveBeenCalled();
  });

  it('seeds from shared SSM when build injects an empty secrets map', () => {
    const sharedName = amplifySharedSecretParamName(
      'd3j7dgxx3prj17',
      'wmw.google-service-account',
    );
    const fetchParameter = vi.fn((name: string) =>
      name === sharedName ? saJson : null,
    );

    const result = ensureWmwSecretInAmplifySecretsEnv(
      {
        WMW_SPREADSHEET_ID: 'sheet-id',
        WMW_GOOGLE_SA_SECRET_NAME: 'wmw.google-service-account',
        secrets: JSON.stringify({}),
        AWS_APP_ID: 'd3j7dgxx3prj17',
        AWS_BRANCH: 'main',
      },
      { fetchParameter },
    );

    expect(result.seededFrom).toBe(sharedName);
    expect(parseAmplifySecretsMap(result.env.secrets)).toEqual({
      'wmw.google-service-account': saJson,
    });
    expect(fetchParameter).toHaveBeenCalledWith(
      amplifyBranchSecretParamName(
        'd3j7dgxx3prj17',
        'main',
        'wmw.google-service-account',
      ),
    );
    expect(fetchParameter).toHaveBeenCalledWith(sharedName);
  });

  it('prefers branch SSM over shared when both could resolve', () => {
    const branchName = amplifyBranchSecretParamName(
      'd3j7dgxx3prj17',
      'main',
      'wmw.google-service-account',
    );
    const fetchParameter = vi.fn((name: string) =>
      name === branchName ? saJson : 'SHOULD_NOT_USE',
    );

    const result = ensureWmwSecretInAmplifySecretsEnv(
      {
        secrets: '{}',
        AWS_APP_ID: 'd3j7dgxx3prj17',
        AWS_BRANCH: 'main',
      },
      { fetchParameter },
    );

    expect(result.seededFrom).toBe(branchName);
    expect(fetchParameter).toHaveBeenCalledTimes(1);
  });
});

describe('flattenWmwServiceAccountJsonEnv', () => {
  it('promotes the secrets-map leaf into WMW_GOOGLE_SERVICE_ACCOUNT_JSON', () => {
    const saJson =
      '{"client_email":"a@b.com","private_key":"-----BEGIN PRIVATE KEY-----\\nx\\n-----END PRIVATE KEY-----\\n"}';
    const flattened = flattenWmwServiceAccountJsonEnv({
      secrets: JSON.stringify({ 'wmw.google-service-account': saJson }),
    });
    expect(flattened.WMW_GOOGLE_SERVICE_ACCOUNT_JSON).toBe(saJson);
  });

  it('does not overwrite an existing top-level JSON env', () => {
    const existing = '{"client_email":"keep@b.com"}';
    const flattened = flattenWmwServiceAccountJsonEnv({
      WMW_GOOGLE_SERVICE_ACCOUNT_JSON: existing,
      secrets: JSON.stringify({
        'wmw.google-service-account': '{"client_email":"other@b.com"}',
      }),
    });
    expect(flattened.WMW_GOOGLE_SERVICE_ACCOUNT_JSON).toBe(existing);
  });
});
