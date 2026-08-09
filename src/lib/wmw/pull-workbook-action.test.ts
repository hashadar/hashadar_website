import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  pullWmwWorkbookTabs,
  WMW_WORKBOOK_NOT_CONFIGURED_REASON,
} from '@/lib/wmw/pull-workbook-action';
import { WMW_SPREADSHEET_ID_ENV } from '@/lib/wmw/config';
import { WMW_GOOGLE_SERVICE_ACCOUNT_JSON_ENV } from '@/lib/wmw/google-sa-credentials';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe('pullWmwWorkbookTabs', () => {
  it('fails clearly when spreadsheet ID or SA credentials are missing', async () => {
    delete process.env[WMW_SPREADSHEET_ID_ENV];
    delete process.env[WMW_GOOGLE_SERVICE_ACCOUNT_JSON_ENV];
    delete process.env.secrets;

    await expect(pullWmwWorkbookTabs()).rejects.toThrow(
      WMW_WORKBOOK_NOT_CONFIGURED_REASON,
    );
  });

  it('fails clearly when only spreadsheet ID is set', async () => {
    process.env[WMW_SPREADSHEET_ID_ENV] = 'sheet-id-only';
    delete process.env[WMW_GOOGLE_SERVICE_ACCOUNT_JSON_ENV];
    delete process.env.secrets;

    await expect(pullWmwWorkbookTabs()).rejects.toThrow(
      WMW_WORKBOOK_NOT_CONFIGURED_REASON,
    );
  });
});
