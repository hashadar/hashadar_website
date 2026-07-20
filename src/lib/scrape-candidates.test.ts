import { describe, expect, it, vi } from 'vitest';
import {
  acceptScrapeCandidate,
  applyOwnerMetadata,
  enqueueScrapeCandidate,
  listPendingScrapeCandidates,
  rejectScrapeCandidate,
  type ScrapeCandidateRecord,
} from './scrape-candidates';

const validBody = `---
collectedAt: 2026-06-15T10:00:00.000Z
title: Senior Data Scientist
source: example-board
---

# Senior Data Scientist
`;

function pendingCandidate(
  overrides: Partial<ScrapeCandidateRecord> & Pick<ScrapeCandidateRecord, 'id'>,
): ScrapeCandidateRecord {
  return {
    fileName: 'senior-data-scientist.md',
    body: validBody,
    status: 'pending',
    title: 'Senior Data Scientist',
    collectedAt: '2026-06-15T10:00:00.000Z',
    source: 'example-board',
    ...overrides,
  };
}

describe('enqueueScrapeCandidate', () => {
  it('writes to the candidates/ prefix, not raw/, and creates a pending record', async () => {
    const putCandidateObject = vi.fn(async () => undefined);
    const createScrapeCandidate = vi.fn(
      async (input: Omit<ScrapeCandidateRecord, 'id'>) => ({
        id: 'candidate-1',
        ...input,
      }),
    );

    const result = await enqueueScrapeCandidate(
      { fileName: 'senior-data-scientist.md', body: validBody },
      { putCandidateObject, createScrapeCandidate },
    );

    expect(result).toEqual({
      status: 'enqueued',
      candidate: expect.objectContaining({
        id: 'candidate-1',
        status: 'pending',
        fileName: 'senior-data-scientist.md',
      }),
    });
    expect(putCandidateObject).toHaveBeenCalledOnce();
    expect(putCandidateObject).toHaveBeenCalledWith({
      key: 'candidates/senior-data-scientist.md',
      body: validBody,
    });
    expect(createScrapeCandidate).toHaveBeenCalledOnce();
    expect(createScrapeCandidate.mock.calls[0][0]).toMatchObject({
      status: 'pending',
      fileName: 'senior-data-scientist.md',
      body: validBody,
      candidateS3Key: 'candidates/senior-data-scientist.md',
    });
  });

  it('rejects invalid markdown before writing outside raw/', async () => {
    const putCandidateObject = vi.fn(async () => undefined);
    const createScrapeCandidate = vi.fn(async () => {
      throw new Error('create must not run');
    });

    const result = await enqueueScrapeCandidate(
      { fileName: 'bad.md', body: '# No frontmatter' },
      { putCandidateObject, createScrapeCandidate },
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Missing YAML frontmatter',
    });
    expect(putCandidateObject).not.toHaveBeenCalled();
    expect(createScrapeCandidate).not.toHaveBeenCalled();
  });

  it('creates a pending record when optional storage is unavailable', async () => {
    const createScrapeCandidate = vi.fn(
      async (input: Omit<ScrapeCandidateRecord, 'id'>) => ({
        id: 'candidate-2',
        ...input,
      }),
    );

    const result = await enqueueScrapeCandidate(
      { fileName: 'role.md', body: validBody },
      { createScrapeCandidate },
    );

    expect(result.status).toBe('enqueued');
    expect(createScrapeCandidate.mock.calls[0][0]).toMatchObject({
      status: 'pending',
      fileName: 'role.md',
    });
    expect(createScrapeCandidate.mock.calls[0][0]).not.toHaveProperty('candidateS3Key');
  });
});

describe('listPendingScrapeCandidates', () => {
  it('returns only pending candidates for the owner queue', async () => {
    const records = [
      pendingCandidate({ id: 'a' }),
      pendingCandidate({ id: 'b', status: 'accepted' }),
      pendingCandidate({ id: 'c', status: 'rejected' }),
      pendingCandidate({ id: 'd' }),
    ];

    const pending = await listPendingScrapeCandidates({
      listScrapeCandidates: async () => records,
    });

    expect(pending.map((item) => item.id)).toEqual(['a', 'd']);
  });
});

describe('acceptScrapeCandidate', () => {
  it('promotes a pending candidate into raw/ via uploadJobDescription then marks accepted', async () => {
    const candidate = pendingCandidate({ id: 'candidate-accept' });
    const uploadJobDescription = vi.fn(async () => ({
      status: 'uploaded' as const,
      s3Key: 'raw/senior-data-scientist.md',
    }));
    const saveScrapeCandidate = vi.fn(async () => undefined);

    const result = await acceptScrapeCandidate('candidate-accept', {
      getScrapeCandidate: async () => candidate,
      saveScrapeCandidate,
      uploadJobDescription,
    });

    expect(result).toEqual({
      status: 'accepted',
      s3Key: 'raw/senior-data-scientist.md',
      candidate: expect.objectContaining({ id: 'candidate-accept', status: 'accepted' }),
    });
    expect(uploadJobDescription).toHaveBeenCalledOnce();
    expect(uploadJobDescription).toHaveBeenCalledWith({
      fileName: 'senior-data-scientist.md',
      body: validBody,
    });
    expect(saveScrapeCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'candidate-accept', status: 'accepted' }),
    );
  });

  it('does not promote when the candidate is not pending', async () => {
    const uploadJobDescription = vi.fn(async () => ({
      status: 'uploaded' as const,
      s3Key: 'raw/senior-data-scientist.md',
    }));

    const result = await acceptScrapeCandidate('candidate-accepted', {
      getScrapeCandidate: async () =>
        pendingCandidate({ id: 'candidate-accepted', status: 'accepted' }),
      saveScrapeCandidate: async () => undefined,
      uploadJobDescription,
    });

    expect(result).toEqual({ status: 'not_pending' });
    expect(uploadJobDescription).not.toHaveBeenCalled();
  });

  it('leaves the candidate pending when raw/ upload fails', async () => {
    const candidate = pendingCandidate({ id: 'candidate-fail' });
    const saveScrapeCandidate = vi.fn(async () => undefined);

    const result = await acceptScrapeCandidate('candidate-fail', {
      getScrapeCandidate: async () => candidate,
      saveScrapeCandidate,
      uploadJobDescription: async () => ({
        status: 'rejected',
        reason: 'Upload client is not configured',
      }),
    });

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Upload client is not configured',
    });
    expect(saveScrapeCandidate).not.toHaveBeenCalled();
  });

  it('does not call LLM assist by default', async () => {
    const candidate = pendingCandidate({ id: 'candidate-no-llm' });
    const assistWithLlm = vi.fn(async () => ({
      title: 'LLM title',
    }));
    const uploadJobDescription = vi.fn(async () => ({
      status: 'uploaded' as const,
      s3Key: 'raw/senior-data-scientist.md',
    }));

    await acceptScrapeCandidate('candidate-no-llm', {
      getScrapeCandidate: async () => candidate,
      saveScrapeCandidate: async () => undefined,
      uploadJobDescription,
      assistWithLlm,
    });

    expect(assistWithLlm).not.toHaveBeenCalled();
    expect(uploadJobDescription).toHaveBeenCalledWith({
      fileName: 'senior-data-scientist.md',
      body: validBody,
    });
  });

  it('uses injectable LLM assist when explicitly opted in', async () => {
    const candidate = pendingCandidate({
      id: 'candidate-llm',
      title: undefined,
      source: undefined,
    });
    const enrichedBody = `---
collectedAt: 2026-06-15T10:00:00.000Z
title: Inferred title
source: inferred-board
---

# Senior Data Scientist
`;
    const assistWithLlm = vi.fn(async () => ({
      title: 'Inferred title',
      source: 'inferred-board',
      body: enrichedBody,
    }));
    const uploadJobDescription = vi.fn(async () => ({
      status: 'uploaded' as const,
      s3Key: 'raw/senior-data-scientist.md',
    }));

    const result = await acceptScrapeCandidate(
      'candidate-llm',
      {
        getScrapeCandidate: async () => candidate,
        saveScrapeCandidate: async () => undefined,
        uploadJobDescription,
        assistWithLlm,
      },
      { llmAssist: true },
    );

    expect(result.status).toBe('accepted');
    expect(assistWithLlm).toHaveBeenCalledOnce();
    expect(assistWithLlm).toHaveBeenCalledWith(candidate);
    expect(uploadJobDescription).toHaveBeenCalledWith({
      fileName: 'senior-data-scientist.md',
      body: enrichedBody,
    });
  });

  it('accepts without LLM assist when opted in but no adapter is configured', async () => {
    const candidate = pendingCandidate({ id: 'candidate-llm-no-adapter' });
    const uploadJobDescription = vi.fn(async () => ({
      status: 'uploaded' as const,
      s3Key: 'raw/senior-data-scientist.md',
    }));

    const result = await acceptScrapeCandidate(
      'candidate-llm-no-adapter',
      {
        getScrapeCandidate: async () => candidate,
        saveScrapeCandidate: async () => undefined,
        uploadJobDescription,
      },
      { llmAssist: true },
    );

    expect(result.status).toBe('accepted');
    expect(uploadJobDescription).toHaveBeenCalledWith({
      fileName: 'senior-data-scientist.md',
      body: validBody,
    });
  });
});

describe('rejectScrapeCandidate', () => {
  it('marks a pending candidate rejected without writing to raw/', async () => {
    const candidate = pendingCandidate({ id: 'candidate-reject' });
    const saveScrapeCandidate = vi.fn(async () => undefined);
    const uploadJobDescription = vi.fn(async () => ({
      status: 'uploaded' as const,
      s3Key: 'raw/senior-data-scientist.md',
    }));

    const result = await rejectScrapeCandidate('candidate-reject', {
      getScrapeCandidate: async () => candidate,
      saveScrapeCandidate,
    });

    expect(result).toEqual({
      status: 'rejected',
      candidate: expect.objectContaining({ id: 'candidate-reject', status: 'rejected' }),
    });
    expect(saveScrapeCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'candidate-reject', status: 'rejected' }),
    );
    expect(uploadJobDescription).not.toHaveBeenCalled();
  });

  it('returns not_found when the candidate does not exist', async () => {
    const result = await rejectScrapeCandidate('missing', {
      getScrapeCandidate: async () => null,
      saveScrapeCandidate: async () => undefined,
    });

    expect(result).toEqual({ status: 'not_found' });
  });
});

describe('applyOwnerMetadata', () => {
  it('writes source into frontmatter and record fields for HITL tagging', () => {
    const candidate = pendingCandidate({
      id: 'c-tags',
      source: undefined,
      body: `---
collectedAt: 2026-06-15T10:00:00.000Z
title: Senior Data Scientist
---

# Senior Data Scientist
`,
    });

    const result = applyOwnerMetadata(candidate, {
      title: 'Senior Data Scientist',
      source: 'linkedin',
      collectedAt: '2026-06-15T10:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.candidate.source).toBe('linkedin');
    expect(result.candidate.body).toContain('source: linkedin');
  });

  it('rejects invalid collectedAt without mutating the candidate', () => {
    const candidate = pendingCandidate({ id: 'c-bad-date' });
    const result = applyOwnerMetadata(candidate, {
      title: candidate.title,
      source: 'board',
      collectedAt: 'not-a-date',
    });

    expect(result).toEqual({
      ok: false,
      reason: 'Frontmatter requires a valid collectedAt',
    });
  });
});
