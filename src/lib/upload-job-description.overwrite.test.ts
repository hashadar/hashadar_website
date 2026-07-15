import { describe, expect, it, vi } from 'vitest';
import {
  overwriteJobDescriptionMarkdown,
  uploadJobDescription,
} from './upload-job-description';

describe('overwriteJobDescriptionMarkdown', () => {
  it('writes markdown to an existing raw key after validation', async () => {
    const putRawObject = vi.fn(async () => undefined);
    const body =
      '---\ncollectedAt: 2026-07-01T00:00:00.000Z\n---\nUpdated body\n';

    const result = await overwriteJobDescriptionMarkdown(
      { s3Key: 'raw/role.md', body },
      { putRawObject },
    );

    expect(result).toEqual({ status: 'uploaded', s3Key: 'raw/role.md' });
    expect(putRawObject).toHaveBeenCalledWith({
      key: 'raw/role.md',
      body,
    });
  });

  it('rejects invalid markdown before storage write', async () => {
    const putRawObject = vi.fn(async () => undefined);
    const result = await overwriteJobDescriptionMarkdown(
      { s3Key: 'raw/role.md', body: '# No frontmatter' },
      { putRawObject },
    );
    expect(result.status).toBe('rejected');
    expect(putRawObject).not.toHaveBeenCalled();
  });
});

describe('uploadJobDescription (smoke)', () => {
  it('still uploads new files under raw/', async () => {
    const putRawObject = vi.fn(async () => undefined);
    const body =
      '---\ncollectedAt: 2026-07-01T00:00:00.000Z\n---\nBody\n';
    const result = await uploadJobDescription(
      { fileName: 'new.md', body },
      { putRawObject },
    );
    expect(result).toEqual({ status: 'uploaded', s3Key: 'raw/new.md' });
  });
});
