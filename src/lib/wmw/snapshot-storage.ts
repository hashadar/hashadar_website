import { isAmplifyClientConfigured } from '@/lib/is-amplify-client-configured';
import {
  WMW_LAST_GOOD_META_KEY,
  WMW_LAST_GOOD_SNAPSHOT_KEY,
  WMW_SNAPSHOTS_BUCKET,
  type WmwSnapshotMeta,
} from '@/lib/wmw/paths';

export type { WmwSnapshotMeta };

/** No charset — browsers rewrite string Content-Types and break SigV4. */
export const WMW_SNAPSHOT_CONTENT_TYPE = 'application/json';

export const WMW_SNAPSHOT_CLIENT_NOT_CONFIGURED_REASON =
  'WMW Snapshot storage client is not configured';

export const WMW_SNAPSHOT_UNAUTHENTICATED_REASON =
  'You must be signed in to manage WMW Snapshots.';

export const WMW_SNAPSHOT_FAILED_REASON =
  'Unable to save the WMW Snapshot. Please try again.';

export type WmwUploadData = (input: {
  path: string;
  data: string | Blob | ArrayBuffer | Uint8Array;
  options?: {
    contentType?: string;
    bucket?: string;
  };
}) => { result: Promise<unknown> };

export type WmwDownloadData = (input: {
  path: string;
  options?: { bucket?: string };
}) => {
  result: Promise<{ body: { text: () => Promise<string> } }>;
};

export type WmwLastGoodSnapshot = {
  snapshotJson: string;
  meta: WmwSnapshotMeta;
};

export type WmwSnapshotStorage = {
  putLastGoodSnapshot: (input: {
    snapshotJson: string;
    asOf: string;
  }) => Promise<void>;
  getLastGoodSnapshot: () => Promise<WmwLastGoodSnapshot | null>;
};

const bucketOptions = { bucket: WMW_SNAPSHOTS_BUCKET };

function isUnauthenticatedError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('no current user') ||
    lower.includes('not authorized') ||
    lower.includes('unauthorised') ||
    lower.includes('unauthorized') ||
    lower.includes('not authenticated') ||
    lower.includes('user is not authenticated')
  );
}

function encodeJson(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function parseMeta(text: string): WmwSnapshotMeta | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('asOf' in parsed) ||
      typeof (parsed as { asOf: unknown }).asOf !== 'string' ||
      !(parsed as { asOf: string }).asOf.trim()
    ) {
      return null;
    }
    return { asOf: (parsed as { asOf: string }).asOf };
  } catch {
    return null;
  }
}

export async function putLastGoodViaUploadData(
  input: { snapshotJson: string; asOf: string },
  uploadData: WmwUploadData,
): Promise<void> {
  const meta: WmwSnapshotMeta = { asOf: input.asOf };
  await uploadData({
    path: WMW_LAST_GOOD_SNAPSHOT_KEY,
    data: encodeJson(input.snapshotJson),
    options: { ...bucketOptions, contentType: WMW_SNAPSHOT_CONTENT_TYPE },
  }).result;
  await uploadData({
    path: WMW_LAST_GOOD_META_KEY,
    data: encodeJson(JSON.stringify(meta)),
    options: { ...bucketOptions, contentType: WMW_SNAPSHOT_CONTENT_TYPE },
  }).result;
}

export async function getLastGoodViaDownloadData(
  downloadData: WmwDownloadData,
): Promise<WmwLastGoodSnapshot | null> {
  try {
    const [{ body: snapshotBody }, { body: metaBody }] = await Promise.all([
      downloadData({
        path: WMW_LAST_GOOD_SNAPSHOT_KEY,
        options: bucketOptions,
      }).result,
      downloadData({
        path: WMW_LAST_GOOD_META_KEY,
        options: bucketOptions,
      }).result,
    ]);
    const snapshotJson = await snapshotBody.text();
    const meta = parseMeta(await metaBody.text());
    if (!meta) {
      return null;
    }
    return { snapshotJson, meta };
  } catch {
    return null;
  }
}

export function createWmwSnapshotStorage(options: {
  uploadData: WmwUploadData;
  downloadData: WmwDownloadData;
}): WmwSnapshotStorage {
  return {
    async putLastGoodSnapshot(input) {
      try {
        await putLastGoodViaUploadData(input, options.uploadData);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (isUnauthenticatedError(message)) {
          throw new Error(WMW_SNAPSHOT_UNAUTHENTICATED_REASON);
        }
        throw new Error(message.trim() || WMW_SNAPSHOT_FAILED_REASON);
      }
    },
    async getLastGoodSnapshot() {
      return getLastGoodViaDownloadData(options.downloadData);
    },
  };
}

export function createMemoryWmwSnapshotStorage(
  initial?: WmwLastGoodSnapshot | null,
): WmwSnapshotStorage {
  let stored: WmwLastGoodSnapshot | null = initial ?? null;

  return {
    async putLastGoodSnapshot({ snapshotJson, asOf }) {
      stored = { snapshotJson, meta: { asOf } };
    },
    async getLastGoodSnapshot() {
      return stored;
    },
  };
}

export async function createDefaultWmwSnapshotStorage(): Promise<WmwSnapshotStorage | null> {
  if (!isAmplifyClientConfigured()) {
    return null;
  }

  try {
    const { uploadData, downloadData } = await import('aws-amplify/storage');
    return createWmwSnapshotStorage({
      uploadData: uploadData as WmwUploadData,
      downloadData: downloadData as WmwDownloadData,
    });
  } catch {
    return null;
  }
}
