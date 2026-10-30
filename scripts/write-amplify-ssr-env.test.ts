import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCourtBoardSsrConfigModuleSource,
  buildWmwSsrConfigModuleSource,
  readCourtBoardTableNameFromOutputs,
  resolveCourtBoardSsrConfigValues,
  resolveWmwSsrConfigValues,
  writeCourtBoardSsrConfigFile,
} from './write-amplify-ssr-env';

describe('resolveWmwSsrConfigValues', () => {
  it('reads spreadsheet id and falls back to defaults', () => {
    expect(
      resolveWmwSsrConfigValues({
        WMW_SPREADSHEET_ID: ' sheet-123 ',
        WMW_GOOGLE_SA_SECRET_NAME: 'wmw.google-service-account',
        AWS_APP_ID: 'app-example',
        AWS_REGION: 'eu-west-2',
      }),
    ).toEqual({
      appId: 'app-example',
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
      appId: 'app-example',
      region: 'eu-west-2',
      spreadsheetId: 'sheet-id',
      googleSaSecretName: 'wmw.google-service-account',
    });
    expect(source).toContain('appId: "app-example"');
    expect(source).toContain('spreadsheetId: "sheet-id"');
    expect(source).toContain('googleSaSecretName: "wmw.google-service-account"');
    expect(source).not.toContain('PRIVATE KEY');
  });
});

describe('Court Board SSR config', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'court-board-ssr-'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function outputs(content: string): string {
    const file = path.join(dir, 'amplify_outputs.json');
    writeFileSync(file, content, 'utf8');
    return file;
  }

  it('reads the table name from custom outputs', () => {
    const file = outputs(
      JSON.stringify({ custom: { courtBoardTableName: ' CourtBoardTable ' } }),
    );
    expect(readCourtBoardTableNameFromOutputs(file)).toBe('CourtBoardTable');
  });

  it('returns null for a missing, invalid or incomplete outputs file', () => {
    expect(
      readCourtBoardTableNameFromOutputs(path.join(dir, 'missing.json')),
    ).toBeNull();
    expect(readCourtBoardTableNameFromOutputs(outputs('{not json'))).toBeNull();
    expect(readCourtBoardTableNameFromOutputs(outputs('{"custom":{}}'))).toBeNull();
    expect(readCourtBoardTableNameFromOutputs(outputs('null'))).toBeNull();
  });

  it('prefers the COURT_BOARD_TABLE env override over outputs', () => {
    const file = outputs(
      JSON.stringify({ custom: { courtBoardTableName: 'FromOutputs' } }),
    );
    expect(
      resolveCourtBoardSsrConfigValues(
        { COURT_BOARD_TABLE: 'FromEnv', AWS_APP_ID: 'app-example' },
        file,
      ),
    ).toEqual({
      appId: 'app-example',
      region: 'eu-west-2',
      tableName: 'FromEnv',
    });
    expect(resolveCourtBoardSsrConfigValues({}, file).tableName).toBe(
      'FromOutputs',
    );
  });

  it('embeds values with JSON string escaping and no secrets', () => {
    const source = buildCourtBoardSsrConfigModuleSource({
      appId: 'app-example',
      region: 'eu-west-2',
      tableName: 'Table"Name',
    });
    expect(source).toContain("import 'server-only'");
    expect(source).toContain('appId: "app-example"');
    expect(source).toContain('tableName: "Table\\"Name"');
    expect(source).not.toMatch(/pepper:/i);
  });

  it('writes null when no table is configured', () => {
    const target = path.join(dir, 'court-board-ssr-config.ts');
    expect(
      writeCourtBoardSsrConfigFile({}, target, path.join(dir, 'missing.json')),
    ).toEqual({ path: target, tableNameSet: false });
    expect(readFileSync(target, 'utf8')).toContain('tableName: null');
  });
});
