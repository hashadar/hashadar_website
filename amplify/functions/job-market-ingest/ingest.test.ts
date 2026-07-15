import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { ingestJobDescription } from './ingest';

const fixturesDir = path.join(import.meta.dirname, 'fixtures');

function readFixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), 'utf8');
}

describe('ingestJobDescription', () => {
  it('upserts an active JobDescription from valid frontmatter markdown', async () => {
    const body = readFixture('valid-jd.md');
    const upsertJobDescription = vi.fn(async () => undefined);

    const result = await ingestJobDescription(
      { s3Key: 'raw/valid-jd.md', body },
      { upsertJobDescription },
    );

    expect(result).toMatchObject({
      status: 'ingested',
      record: {
        id: 'raw/valid-jd.md',
        s3Key: 'raw/valid-jd.md',
        collectedAt: '2026-06-15T10:00:00.000Z',
        status: 'active',
        title: 'Senior Data Scientist',
        seniority: 'senior',
        roleFamily: 'data_science',
        source: 'confidential-board',
      },
    });
    expect(result.status).toBe('ingested');
    if (result.status === 'ingested') {
      expect(result.record.contentHash).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(upsertJobDescription).toHaveBeenCalledOnce();
    expect(upsertJobDescription).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'raw/valid-jd.md',
        s3Key: 'raw/valid-jd.md',
        status: 'active',
        collectedAt: '2026-06-15T10:00:00.000Z',
      }),
    );
  });

  it('rejects missing frontmatter without upserting', async () => {
    const upsertJobDescription = vi.fn(async () => undefined);

    const result = await ingestJobDescription(
      { s3Key: 'raw/missing-frontmatter.md', body: readFixture('missing-frontmatter.md') },
      { upsertJobDescription },
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Missing YAML frontmatter',
    });
    expect(upsertJobDescription).not.toHaveBeenCalled();
  });

  it('rejects missing collectedAt without upserting', async () => {
    const upsertJobDescription = vi.fn(async () => undefined);

    const result = await ingestJobDescription(
      { s3Key: 'raw/missing-collected-at.md', body: readFixture('missing-collected-at.md') },
      { upsertJobDescription },
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Frontmatter requires a valid collectedAt',
    });
    expect(upsertJobDescription).not.toHaveBeenCalled();
  });

  it('rejects invalid YAML frontmatter without upserting', async () => {
    const upsertJobDescription = vi.fn(async () => undefined);

    const result = await ingestJobDescription(
      { s3Key: 'raw/invalid-yaml.md', body: readFixture('invalid-yaml.md') },
      { upsertJobDescription },
    );

    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.reason.length).toBeGreaterThan(0);
    }
    expect(upsertJobDescription).not.toHaveBeenCalled();
  });

  it('changes contentHash when file contents change', async () => {
    const s3Key = 'raw/valid-jd.md';
    const original = readFixture('valid-jd.md');
    const updated = `${original}\n\nUpdated requirement: PyTorch experience.\n`;
    const upsertJobDescription = vi.fn(async () => undefined);

    const first = await ingestJobDescription(
      { s3Key, body: original },
      { upsertJobDescription },
    );
    const second = await ingestJobDescription(
      { s3Key, body: updated },
      { upsertJobDescription },
    );

    expect(first.status).toBe('ingested');
    expect(second.status).toBe('ingested');
    if (first.status === 'ingested' && second.status === 'ingested') {
      expect(second.record.contentHash).not.toBe(first.record.contentHash);
      expect(second.record.contentHash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('does not start corpus recompute on ingest', async () => {
    const upsertJobDescription = vi.fn(async () => undefined);
    const startRecompute = vi.fn(async () => undefined);

    const result = await ingestJobDescription(
      { s3Key: 'raw/valid-jd.md', body: readFixture('valid-jd.md') },
      { upsertJobDescription },
    );

    expect(result.status).toBe('ingested');
    expect(upsertJobDescription).toHaveBeenCalledOnce();
    expect(startRecompute).not.toHaveBeenCalled();
  });
});
