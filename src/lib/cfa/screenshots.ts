import { CFA_SCREENSHOTS_BUCKET } from '@/lib/cfa/paths';

/** Private screenshot + assist-result storage (bucket `cfaScreenshots`). */
export type CfaScreenshotStorage = {
  upload: (key: string, data: Blob, contentType: string) => Promise<void>;
  /** Short-lived signed URL for viewing a private screenshot. */
  getUrl: (key: string) => Promise<string>;
  /** Text of an object, or null when it does not exist (yet). */
  readText: (key: string) => Promise<string | null>;
  remove: (key: string) => Promise<void>;
};

export type AmplifyStorageApi = {
  uploadData: (input: {
    path: string;
    data: Blob;
    options?: { bucket?: string; contentType?: string };
  }) => { result: Promise<unknown> };
  getUrl: (input: {
    path: string;
    options?: { bucket?: string; expiresIn?: number };
  }) => Promise<{ url: URL }>;
  downloadData: (input: {
    path: string;
    options?: { bucket?: string };
  }) => { result: Promise<{ body: { text: () => Promise<string> } }> };
  remove: (input: { path: string; options?: { bucket?: string } }) => Promise<unknown>;
};

const SIGNED_URL_SECONDS = 15 * 60;

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
  return (
    record.name === 'NoSuchKey' ||
    record.name === 'NotFound' ||
    record.$metadata?.httpStatusCode === 404 ||
    /not ?found|does not exist|nosuchkey/i.test(record.message ?? '')
  );
}

export function createAmplifyCfaScreenshotStorage(
  getApi: () => Promise<AmplifyStorageApi>,
): CfaScreenshotStorage {
  const bucket = CFA_SCREENSHOTS_BUCKET;
  return {
    async upload(key, data, contentType) {
      const api = await getApi();
      await api.uploadData({ path: key, data, options: { bucket, contentType } }).result;
    },
    async getUrl(key) {
      const api = await getApi();
      const { url } = await api.getUrl({
        path: key,
        options: { bucket, expiresIn: SIGNED_URL_SECONDS },
      });
      return url.toString();
    },
    async readText(key) {
      const api = await getApi();
      try {
        const { body } = await api.downloadData({ path: key, options: { bucket } }).result;
        return await body.text();
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },
    async remove(key) {
      const api = await getApi();
      await api.remove({ path: key, options: { bucket } });
    },
  };
}

/** In-memory storage for tests (object URLs for previews). */
export function createMemoryCfaScreenshotStorage(): CfaScreenshotStorage & {
  objects: Map<string, { data: Blob; contentType: string }>;
} {
  const objects = new Map<string, { data: Blob; contentType: string }>();
  return {
    objects,
    async upload(key, data, contentType) {
      objects.set(key, { data, contentType });
    },
    async getUrl(key) {
      const object = objects.get(key);
      if (!object) throw new Error('Screenshot not found');
      return typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(object.data)
        : `memory://${key}`;
    },
    async readText(key) {
      const object = objects.get(key);
      return object ? object.data.text() : null;
    },
    async remove(key) {
      objects.delete(key);
    },
  };
}
