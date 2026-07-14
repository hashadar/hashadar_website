import { describe, expect, it, vi } from 'vitest';
import {
  createDefaultPutRawObject,
  putRawObjectViaUploadData,
  putRawObjectWithAuthHandling,
} from './upload-job-description-client';

describe('putRawObjectViaUploadData', () => {
  it('writes markdown to the given raw key via Amplify uploadData', async () => {
    const uploadData = vi.fn(() => ({
      result: Promise.resolve({ path: 'raw/role.md' }),
    }));

    await putRawObjectViaUploadData(
      { key: 'raw/role.md', body: '# Role' },
      uploadData,
    );

    expect(uploadData).toHaveBeenCalledWith({
      path: 'raw/role.md',
      data: '# Role',
      options: {
        contentType: 'text/markdown; charset=utf-8',
      },
    });
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
