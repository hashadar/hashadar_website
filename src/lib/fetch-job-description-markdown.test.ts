import { describe, expect, it, vi } from 'vitest';
import { fetchJobDescriptionMarkdown } from './fetch-job-description-markdown';

describe('fetchJobDescriptionMarkdown', () => {
  it('returns markdown from injectable storage deps', async () => {
    const fetchMarkdown = vi.fn(async (s3Key: string) => {
      expect(s3Key).toBe('raw/senior-data-scientist.md');
      return '---\ncollectedAt: 2026-07-01\n---\n\nPython role.';
    });

    await expect(
      fetchJobDescriptionMarkdown('raw/senior-data-scientist.md', {
        fetchMarkdown,
      }),
    ).resolves.toBe('---\ncollectedAt: 2026-07-01\n---\n\nPython role.');
  });

  it('returns null for blank keys without calling storage', async () => {
    const fetchMarkdown = vi.fn(async () => 'should-not-run');

    await expect(
      fetchJobDescriptionMarkdown('   ', { fetchMarkdown }),
    ).resolves.toBeNull();
    expect(fetchMarkdown).not.toHaveBeenCalled();
  });
});
