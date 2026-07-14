import type { PutRawObject } from './upload-job-description';
import { isAmplifyClientConfigured } from './start-job-market-recompute-client';

export const UPLOAD_CLIENT_NOT_CONFIGURED_REASON =
  'Upload client is not configured';

export const UPLOAD_UNAUTHENTICATED_REASON =
  'You must be signed in to upload a job description.';

export const UPLOAD_FAILED_REASON =
  'Unable to upload job description. Please try again.';

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

export type AmplifyUploadData = (input: {
  path: string;
  data: string;
  options?: { contentType?: string };
}) => { result: Promise<unknown> };

export async function putRawObjectViaUploadData(
  input: { key: string; body: string },
  uploadData: AmplifyUploadData,
): Promise<void> {
  await uploadData({
    path: input.key,
    data: input.body,
    options: {
      contentType: 'text/markdown; charset=utf-8',
    },
  }).result;
}

export async function createDefaultPutRawObject(): Promise<PutRawObject | null> {
  if (!isAmplifyClientConfigured()) {
    return null;
  }

  try {
    const { uploadData } = await import('aws-amplify/storage');
    return (input) =>
      putRawObjectViaUploadData(input, uploadData as AmplifyUploadData);
  } catch {
    return null;
  }
}

export async function putRawObjectWithAuthHandling(
  putRawObject: PutRawObject,
  input: { key: string; body: string },
): Promise<{ status: 'uploaded' } | { status: 'rejected'; reason: string }> {
  try {
    await putRawObject(input);
    return { status: 'uploaded' };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (isUnauthenticatedError(message)) {
      return { status: 'rejected', reason: UPLOAD_UNAUTHENTICATED_REASON };
    }
    return {
      status: 'rejected',
      reason: message.trim() || UPLOAD_FAILED_REASON,
    };
  }
}
