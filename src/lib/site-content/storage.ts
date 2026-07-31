import { isAmplifyClientConfigured } from '@/lib/is-amplify-client-configured';
import { SITE_CONTENT_BUCKET } from '@/lib/site-content/paths';

export type SiteContentUploadData = (input: {
  path: string;
  data: string | Blob | ArrayBuffer | Uint8Array;
  options?: {
    contentType?: string;
    bucket?: string;
  };
}) => { result: Promise<unknown> };

export type SiteContentDownloadData = (input: {
  path: string;
  options?: { bucket?: string };
}) => {
  result: Promise<{ body: { text: () => Promise<string>; blob: () => Promise<Blob> } }>;
};

export type SiteContentRemove = (input: {
  path: string;
  options?: { bucket?: string };
}) => Promise<unknown>;

export type SiteContentGetUrl = (input: {
  path: string;
  options?: { bucket?: string; expiresIn?: number };
}) => Promise<{ url: URL }>;

export type SiteContentStorage = {
  uploadData: SiteContentUploadData;
  downloadData: SiteContentDownloadData;
  remove: SiteContentRemove;
  getUrl: SiteContentGetUrl;
};

const bucketOptions = { bucket: SITE_CONTENT_BUCKET };

export async function downloadSiteContentText(
  key: string,
  downloadData: SiteContentDownloadData,
): Promise<string | null> {
  try {
    const { body } = await downloadData({
      path: key,
      options: bucketOptions,
    }).result;
    return body.text();
  } catch {
    return null;
  }
}

export async function uploadSiteContentText(
  key: string,
  text: string,
  contentType: string,
  uploadData: SiteContentUploadData,
): Promise<void> {
  await uploadData({
    path: key,
    data: new TextEncoder().encode(text),
    options: { ...bucketOptions, contentType },
  }).result;
}

export async function uploadSiteContentBlob(
  key: string,
  data: Blob,
  contentType: string,
  uploadData: SiteContentUploadData,
): Promise<void> {
  await uploadData({
    path: key,
    data,
    options: { ...bucketOptions, contentType },
  }).result;
}

export async function removeSiteContent(
  key: string,
  remove: SiteContentRemove,
): Promise<void> {
  await remove({ path: key, options: bucketOptions });
}

export async function getSiteContentUrl(
  key: string,
  getUrl: SiteContentGetUrl,
  expiresIn = 60 * 60 * 24,
): Promise<string> {
  const { url } = await getUrl({
    path: key,
    options: { ...bucketOptions, expiresIn },
  });
  return url.toString();
}

export async function createDefaultSiteContentStorage(): Promise<SiteContentStorage | null> {
  if (!isAmplifyClientConfigured()) {
    return null;
  }

  try {
    const { uploadData, downloadData, remove, getUrl } = await import(
      'aws-amplify/storage'
    );
    return {
      uploadData: uploadData as SiteContentUploadData,
      downloadData: downloadData as SiteContentDownloadData,
      remove: (async (input) => {
        await remove(input);
      }) as SiteContentRemove,
      getUrl: getUrl as SiteContentGetUrl,
    };
  } catch {
    return null;
  }
}
