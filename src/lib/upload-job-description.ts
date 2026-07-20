import { validateJobDescriptionMarkdown } from './validate-job-description-markdown';
import {
  createDefaultPutRawObject,
  putRawObjectWithAuthHandling,
  UPLOAD_CLIENT_NOT_CONFIGURED_REASON,
} from './upload-job-description-client';

export type UploadJobDescriptionResult =
  | { status: 'uploaded'; s3Key: string }
  | { status: 'rejected'; reason: string };

export type PutRawObject = (input: { key: string; body: string }) => Promise<void>;

export type UploadJobDescriptionDeps = {
  putRawObject?: PutRawObject;
};

function normaliseFileName(fileName: string): string | null {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return null;
  }

  const baseName = trimmed.replace(/^.*[/\\]/, '');
  if (!baseName.toLowerCase().endsWith('.md')) {
    return null;
  }

  return baseName;
}

export async function uploadJobDescription(
  input: { fileName: string; body: string },
  deps: UploadJobDescriptionDeps = {},
): Promise<UploadJobDescriptionResult> {
  const validation = validateJobDescriptionMarkdown(input.body);
  if (validation.status === 'rejected') {
    return validation;
  }

  const fileName = normaliseFileName(input.fileName);
  if (!fileName) {
    return {
      status: 'rejected',
      reason: 'File name must end with .md',
    };
  }

  const putRawObject = deps.putRawObject ?? (await createDefaultPutRawObject());
  if (!putRawObject) {
    return {
      status: 'rejected',
      reason: UPLOAD_CLIENT_NOT_CONFIGURED_REASON,
    };
  }

  const s3Key = `raw/${fileName}`;
  const uploadResult = await putRawObjectWithAuthHandling(putRawObject, {
    key: s3Key,
    body: input.body,
  });

  if (uploadResult.status === 'rejected') {
    return uploadResult;
  }

  return { status: 'uploaded', s3Key };
}

/** Overwrite markdown at an existing corpus object key (no recompute). */
export async function overwriteJobDescriptionMarkdown(
  input: { s3Key: string; body: string },
  deps: UploadJobDescriptionDeps = {},
): Promise<UploadJobDescriptionResult> {
  const validation = validateJobDescriptionMarkdown(input.body);
  if (validation.status === 'rejected') {
    return validation;
  }

  const s3Key = input.s3Key.trim();
  if (!s3Key.startsWith('raw/') || !s3Key.toLowerCase().endsWith('.md')) {
    return {
      status: 'rejected',
      reason: 'Storage key must be a raw/*.md object',
    };
  }

  const putRawObject = deps.putRawObject ?? (await createDefaultPutRawObject());
  if (!putRawObject) {
    return {
      status: 'rejected',
      reason: UPLOAD_CLIENT_NOT_CONFIGURED_REASON,
    };
  }

  const uploadResult = await putRawObjectWithAuthHandling(putRawObject, {
    key: s3Key,
    body: input.body,
  });

  if (uploadResult.status === 'rejected') {
    return uploadResult;
  }

  return { status: 'uploaded', s3Key };
}
