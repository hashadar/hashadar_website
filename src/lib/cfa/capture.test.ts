import { describe, expect, it } from 'vitest';
import { parseStoredDefaults, resolveCaptureDefaults } from '@/lib/cfa/capture';
import { imageFilesFrom, planUpload, scaledSize } from '@/lib/cfa/images';
import { assistResultKey, newCfaId, screenshotKey } from '@/lib/cfa/paths';
import { testSyllabus } from '@/test/fixtures/cfa';

describe('resolveCaptureDefaults', () => {
  it('prefers this device’s last choice', () => {
    expect(
      resolveCaptureDefaults(
        testSyllabus,
        { moduleId: 'beta', readingId: 'beta-one', source: 'Placeholder set' },
        { module: 'alpha', reading: 'alpha-two', source: 'Other set' },
      ),
    ).toEqual({ moduleId: 'beta', readingId: 'beta-one', source: 'Placeholder set' });
  });

  it('falls back to the newest Question on a fresh device', () => {
    expect(
      resolveCaptureDefaults(testSyllabus, null, {
        module: 'alpha',
        reading: 'alpha-two',
        source: 'Other set',
      }),
    ).toEqual({ moduleId: 'alpha', readingId: 'alpha-two', source: 'Other set' });
  });

  it('repairs a stale Reading and has no source default in code', () => {
    expect(
      resolveCaptureDefaults(testSyllabus, { moduleId: 'alpha', readingId: 'gone' }, null),
    ).toEqual({ moduleId: 'alpha', readingId: 'alpha-one', source: '' });
    expect(resolveCaptureDefaults(testSyllabus, null, null)).toEqual({
      moduleId: 'alpha',
      readingId: 'alpha-one',
      source: '',
    });
  });

  it('parses stored JSON defensively', () => {
    expect(parseStoredDefaults('{"moduleId":"beta","source":3}')).toEqual({
      moduleId: 'beta',
      readingId: undefined,
      source: undefined,
    });
    expect(parseStoredDefaults('{bad')).toBeNull();
    expect(parseStoredDefaults(null)).toBeNull();
  });
});

describe('screenshot upload plan', () => {
  it('keeps small PNG and JPEG files', () => {
    expect(planUpload({ type: 'image/png', size: 900_000, width: 1170, height: 2000 })).toEqual({
      action: 'keep',
      contentType: 'image/png',
      extension: 'png',
    });
    expect(planUpload({ type: 'image/jpeg', size: 400_000, width: 800, height: 600 })).toMatchObject({
      action: 'keep',
      extension: 'jpg',
    });
  });

  it('re-encodes large, oversized or other formats', () => {
    expect(planUpload({ type: 'image/png', size: 900_000, width: 1290, height: 2796 })).toEqual({
      action: 'reencode',
      width: 1107,
      height: 2400,
    });
    expect(planUpload({ type: 'image/png', size: 5_000_000, width: 1000, height: 1000 })).toEqual({
      action: 'reencode',
      width: 1000,
      height: 1000,
    });
    expect(planUpload({ type: 'image/heic', size: 1, width: 10, height: 10 }).action).toBe('reencode');
  });

  it('scales the longest edge only', () => {
    expect(scaledSize(4800, 1200)).toEqual({ width: 2400, height: 600 });
    expect(scaledSize(100, 50)).toEqual({ width: 100, height: 50 });
  });

  it('collects image files from a paste', () => {
    const png = new File(['x'], 'shot.png', { type: 'image/png' });
    const files = imageFilesFrom([
      { kind: 'string', type: 'text/plain', getAsFile: () => null },
      { kind: 'file', type: 'image/png', getAsFile: () => png },
      { kind: 'file', type: 'application/pdf', getAsFile: () => null },
    ]);
    expect(files).toEqual([png]);
  });
});

describe('storage keys', () => {
  it('builds screenshot and assist keys the function accepts', () => {
    expect(screenshotKey('capture-abc', 0, 'png')).toBe('screenshots/capture-abc/1.png');
    expect(assistResultKey('job-abc')).toBe('assist/job-abc.json');
    expect(newCfaId('job')).toMatch(/^job-[A-Za-z0-9-]{8,}$/);
  });
});
