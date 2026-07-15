import { describe, expect, it, vi } from 'vitest';
import {
  createDefaultPutRawObject,
  MARKDOWN_CONTENT_TYPE,
  markdownBodyToBinary,
  putRawObjectViaUploadData,
  putRawObjectWithAuthHandling,
} from './upload-job-description-client';

describe('putRawObjectViaUploadData', () => {
  it('uploads UTF-8 bytes with a charset-free Content-Type to avoid SigV4 mismatch', async () => {
    const uploadData = vi.fn(() => ({
      result: Promise.resolve({ path: 'raw/role.md' }),
    }));

    await putRawObjectViaUploadData(
      { key: 'raw/role.md', body: '# Role — café' },
      uploadData,
    );

    expect(uploadData).toHaveBeenCalledWith({
      path: 'raw/role.md',
      data: markdownBodyToBinary('# Role — café'),
      options: {
        contentType: MARKDOWN_CONTENT_TYPE,
      },
    });
    expect(MARKDOWN_CONTENT_TYPE).toBe('text/markdown');
    expect(MARKDOWN_CONTENT_TYPE.includes('charset')).toBe(false);
  });
});

describe('putRawObjectWithAuthHandling', () => {
  it('maps unauthenticated storage errors to a clear rejection reason', async () => {
    const putRawObject = vi.fn(async () => {
      throw new Error('No current user');
    });

    const result = await putRawObjectWithAuthHandling(putRawObject, {
      key: 'raw/role.md',
      body: '# Role',
    });

    expect(result).toEqual({
      status: 'rejected',
      reason: 'You must be signed in to upload a job description.',
    });
  });
});

describe('createDefaultPutRawObject', () => {
  it('returns null when Amplify is not configured', async () => {
    const result = await createDefaultPutRawObject();

    expect(result).toBeNull();
  });
});
