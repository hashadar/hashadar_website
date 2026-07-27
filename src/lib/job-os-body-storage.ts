import type { BodyEntityKind, JobOsBodyStorage } from '@/lib/job-os';
import { isAmplifyClientConfigured } from '@/lib/is-amplify-client-configured';

export const BODY_CLIENT_NOT_CONFIGURED_REASON =
  'Body storage client is not configured';

export const BODY_UNAUTHENTICATED_REASON =
  'You must be signed in to edit Body prose.';

export const BODY_FAILED_REASON =
  'Unable to save Body prose. Please try again.';

/** No charset — browsers rewrite string Content-Types and break SigV4. */
export const BODY_CONTENT_TYPE = 'text/plain';

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

export function bodyEntityS3Key(
  entityKind: BodyEntityKind,
  entityId: string,
): string {
  return `bodies/${entityKind}s/${entityId}.md`;
}

export function proseToBinary(body: string): Uint8Array {
  return new TextEncoder().encode(body);
}

export type AmplifyUploadData = (input: {
  path: string;
  data: string | Blob | ArrayBuffer | Uint8Array;
  options?: { contentType?: string };
}) => { result: Promise<unknown> };

export type AmplifyDownloadData = (input: {
  path: string;
}) => { result: Promise<{ body: { text: () => Promise<string> } }> };

export async function putBodyViaUploadData(
  input: { key: string; body: string },
  uploadData: AmplifyUploadData,
): Promise<void> {
  await uploadData({
    path: input.key,
    data: proseToBinary(input.body),
    options: { contentType: BODY_CONTENT_TYPE },
  }).result;
}

export async function getBodyViaDownloadData(
  key: string,
  downloadData: AmplifyDownloadData,
): Promise<string | null> {
  try {
    const { body } = await downloadData({ path: key }).result;
    return body.text();
  } catch {
    return null;
  }
}

export function createJobOsBodyStorage(options: {
  uploadData: AmplifyUploadData;
  downloadData: AmplifyDownloadData;
}): JobOsBodyStorage {
  return {
    async putBody({ entityKind, entityId, prose }) {
      const s3Key = bodyEntityS3Key(entityKind, entityId);
      try {
        await putBodyViaUploadData(
          { key: s3Key, body: prose },
          options.uploadData,
        );
        return { s3Key };
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (isUnauthenticatedError(message)) {
          throw new Error(BODY_UNAUTHENTICATED_REASON);
        }
        throw new Error(message.trim() || BODY_FAILED_REASON);
      }
    },
    async getBody(s3Key) {
      return getBodyViaDownloadData(s3Key, options.downloadData);
    },
  };
}

export async function createDefaultJobOsBodyStorage(): Promise<JobOsBodyStorage | null> {
  if (!isAmplifyClientConfigured()) {
    return null;
  }

  try {
    const { uploadData, downloadData } = await import('aws-amplify/storage');
    return createJobOsBodyStorage({
      uploadData: uploadData as AmplifyUploadData,
      downloadData: downloadData as AmplifyDownloadData,
    });
  } catch {
    return null;
  }
}
