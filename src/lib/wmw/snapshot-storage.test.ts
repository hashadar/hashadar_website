import { describe, expect, it, vi } from 'vitest';
import {
  WMW_LAST_GOOD_META_KEY,
  WMW_LAST_GOOD_SNAPSHOT_KEY,
  WMW_SNAPSHOTS_BUCKET,
} from '@/lib/wmw/paths';
import {
  createMemoryWmwSnapshotStorage,
  createWmwSnapshotStorage,
  WMW_SNAPSHOT_CONTENT_TYPE,
  WMW_SNAPSHOT_FAILED_REASON,
  WMW_SNAPSHOT_UNAUTHENTICATED_REASON,
  type WmwDownloadData,
  type WmwUploadData,
} from '@/lib/wmw/snapshot-storage';

function createFakeAmplify(files: Record<string, string> = {}): {
  uploadData: WmwUploadData;
  downloadData: WmwDownloadData;
  files: Record<string, string>;
} {
  const store = { ...files };

  const uploadData: WmwUploadData = ({ path, data, options }) => ({
    result: (async () => {
      expect(options?.bucket).toBe(WMW_SNAPSHOTS_BUCKET);
      expect(options?.contentType).toBe(WMW_SNAPSHOT_CONTENT_TYPE);
      const text =
        typeof data === 'string'
          ? data
          : new TextDecoder().decode(data as Uint8Array);
      store[path] = text;
    })(),
  });

  const downloadData: WmwDownloadData = ({ path, options }) => ({
    result: (async () => {
      expect(options?.bucket).toBe(WMW_SNAPSHOTS_BUCKET);
      const text = store[path];
      if (text === undefined) {
        throw new Error('NoSuchKey');
      }
      return {
        body: {
          text: async () => text,
        },
      };
    })(),
  });

  return { uploadData, downloadData, files: store };
}

describe('WMW Snapshot storage', () => {
  it('uses the documented last-good object keys', () => {
    expect(WMW_LAST_GOOD_SNAPSHOT_KEY).toBe('snapshots/last-good.json');
    expect(WMW_LAST_GOOD_META_KEY).toBe('snapshots/last-good.meta.json');
    expect(WMW_SNAPSHOTS_BUCKET).toBe('wmwSnapshots');
  });

  it('round-trips last-good Snapshot JSON and as-of metadata via fakes', async () => {
    const fake = createFakeAmplify();
    const storage = createWmwSnapshotStorage(fake);
    const snapshotJson = JSON.stringify({ accounts: [{ id: 'A1' }] });

    await storage.putLastGoodSnapshot({
      snapshotJson,
      asOf: '2026-08-08T12:00:00.000Z',
    });

    expect(fake.files[WMW_LAST_GOOD_SNAPSHOT_KEY]).toBe(snapshotJson);
    expect(JSON.parse(fake.files[WMW_LAST_GOOD_META_KEY]!)).toEqual({
      asOf: '2026-08-08T12:00:00.000Z',
    });

    await expect(storage.getLastGoodSnapshot()).resolves.toEqual({
      snapshotJson,
      meta: { asOf: '2026-08-08T12:00:00.000Z' },
    });
  });

  it('returns null when no last-good Snapshot exists', async () => {
    const storage = createWmwSnapshotStorage(createFakeAmplify());
    await expect(storage.getLastGoodSnapshot()).resolves.toBeNull();
  });

  it('returns null when as-of metadata is invalid', async () => {
    const storage = createWmwSnapshotStorage(
      createFakeAmplify({
        [WMW_LAST_GOOD_SNAPSHOT_KEY]: '{}',
        [WMW_LAST_GOOD_META_KEY]: '{"asOf":""}',
      }),
    );
    await expect(storage.getLastGoodSnapshot()).resolves.toBeNull();
  });

  it('maps unauthenticated Amplify errors to British English copy', async () => {
    const uploadData = vi.fn(() => ({
      result: Promise.reject(new Error('UserUnAuthenticatedException: No current user')),
    })) as unknown as WmwUploadData;
    const storage = createWmwSnapshotStorage({
      uploadData,
      downloadData: createFakeAmplify().downloadData,
    });

    await expect(
      storage.putLastGoodSnapshot({
        snapshotJson: '{}',
        asOf: '2026-08-08T12:00:00.000Z',
      }),
    ).rejects.toThrow(WMW_SNAPSHOT_UNAUTHENTICATED_REASON);
  });

  it('falls back to a generic failure reason when Amplify rejects without a message', async () => {
    const uploadData = vi.fn(() => ({
      result: Promise.reject(new Error('   ')),
    })) as unknown as WmwUploadData;
    const storage = createWmwSnapshotStorage({
      uploadData,
      downloadData: createFakeAmplify().downloadData,
    });

    await expect(
      storage.putLastGoodSnapshot({
        snapshotJson: '{}',
        asOf: '2026-08-08T12:00:00.000Z',
      }),
    ).rejects.toThrow(WMW_SNAPSHOT_FAILED_REASON);
  });

  it('provides an in-memory fake for Vitest without live AWS', async () => {
    const storage = createMemoryWmwSnapshotStorage();
    await storage.putLastGoodSnapshot({
      snapshotJson: '{"ok":true}',
      asOf: '2026-08-08T15:30:00.000Z',
    });
    await expect(storage.getLastGoodSnapshot()).resolves.toEqual({
      snapshotJson: '{"ok":true}',
      meta: { asOf: '2026-08-08T15:30:00.000Z' },
    });
  });
});
