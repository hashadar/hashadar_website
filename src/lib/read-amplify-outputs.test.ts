import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readAmplifyOutputs } from './read-amplify-outputs';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function writeTempOutputs(contents: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'amplify-outputs-'));
  tempDirs.push(dir);
  const filePath = path.join(dir, 'amplify_outputs.json');
  writeFileSync(filePath, contents, 'utf8');
  return filePath;
}

describe('readAmplifyOutputs', () => {
  it('returns null when the outputs file is absent', () => {
    expect(
      readAmplifyOutputs(path.join(tmpdir(), 'missing-amplify-outputs.json')),
    ).toBeNull();
  });

  it('returns parsed outputs when the file contains a non-empty object', () => {
    const filePath = writeTempOutputs(
      JSON.stringify({ version: '1.4', auth: { user_pool_id: 'eu-west-2_x' } }),
    );

    expect(readAmplifyOutputs(filePath)).toEqual({
      version: '1.4',
      auth: { user_pool_id: 'eu-west-2_x' },
    });
  });
});
