import { describe, expect, it } from 'vitest';
import { buildAmplifySsrEnvLines } from './write-amplify-ssr-env';

describe('buildAmplifySsrEnvLines', () => {
  it('writes present keys as JSON-stringified dotenv lines', () => {
    const secrets = JSON.stringify({
      'wmw.google-service-account': '{"type":"service_account"}',
    });
    const lines = buildAmplifySsrEnvLines({
      WMW_SPREADSHEET_ID: 'sheet-id',
      WMW_GOOGLE_SA_SECRET_NAME: 'wmw.google-service-account',
      secrets,
    });

    expect(lines).toEqual([
      'WMW_SPREADSHEET_ID="sheet-id"',
      'WMW_GOOGLE_SA_SECRET_NAME="wmw.google-service-account"',
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
