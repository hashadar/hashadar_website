import { describe, expect, it } from 'vitest';
import {
  buildWmwSsrConfigModuleSource,
  resolveWmwSsrConfigValues,
} from './write-amplify-ssr-env';

describe('resolveWmwSsrConfigValues', () => {
  it('reads spreadsheet id and falls back to defaults', () => {
    expect(
      resolveWmwSsrConfigValues({
        WMW_SPREADSHEET_ID: ' sheet-123 ',
        WMW_GOOGLE_SA_SECRET_NAME: 'wmw.google-service-account',
        AWS_APP_ID: 'd3j7dgxx3prj17',
        AWS_REGION: 'eu-west-2',
      }),
    ).toEqual({
      appId: 'd3j7dgxx3prj17',
      region: 'eu-west-2',
      spreadsheetId: 'sheet-123',
      googleSaSecretName: 'wmw.google-service-account',
    });
  });

  it('allows null spreadsheet id when unset', () => {
    expect(resolveWmwSsrConfigValues({}).spreadsheetId).toBeNull();
  });
});

describe('buildWmwSsrConfigModuleSource', () => {
  it('embeds values with JSON string escaping', () => {
    const source = buildWmwSsrConfigModuleSource({
      appId: 'd3j7dgxx3prj17',
      region: 'eu-west-2',
      spreadsheetId: 'sheet-id',
      googleSaSecretName: 'wmw.google-service-account',
    });
    expect(source).toContain('spreadsheetId: "sheet-id"');
    expect(source).toContain('googleSaSecretName: "wmw.google-service-account"');
    expect(source).not.toContain('PRIVATE KEY');
  });
});
