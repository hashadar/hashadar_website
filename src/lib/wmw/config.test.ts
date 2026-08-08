import { describe, expect, it } from 'vitest';
import {
  getWmwConfig,
  WMW_GOOGLE_SA_SECRET_NAME_ENV,
  WMW_GOOGLE_SA_SECRET_NAME_PLACEHOLDER,
  WMW_SPREADSHEET_ID_ENV,
} from '@/lib/wmw/config';

describe('getWmwConfig', () => {
  it('returns nulls when env vars are missing', () => {
    expect(getWmwConfig({})).toEqual({
      spreadsheetId: null,
      googleServiceAccountSecretName: null,
    });
  });

  it('reads spreadsheet ID and secret name placeholders', () => {
    expect(
      getWmwConfig({
        [WMW_SPREADSHEET_ID_ENV]: '  sheet-id-123  ',
        [WMW_GOOGLE_SA_SECRET_NAME_ENV]: WMW_GOOGLE_SA_SECRET_NAME_PLACEHOLDER,
      }),
    ).toEqual({
      spreadsheetId: 'sheet-id-123',
      googleServiceAccountSecretName: WMW_GOOGLE_SA_SECRET_NAME_PLACEHOLDER,
    });
  });

  it('treats blank values as unset', () => {
    expect(
      getWmwConfig({
        [WMW_SPREADSHEET_ID_ENV]: '   ',
        [WMW_GOOGLE_SA_SECRET_NAME_ENV]: '',
      }),
    ).toEqual({
      spreadsheetId: null,
      googleServiceAccountSecretName: null,
    });
  });
});
