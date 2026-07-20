import { describe, expect, it, vi } from 'vitest';
import { assembleJobDescriptionMarkdown, normaliseExtraction } from './assemble-markdown';
import { EXTRACT_TOOL_NAME, estimateHaikuCostUsd } from './bedrock-extract';
import type { CreateScrapeCandidate, PutCandidateObject } from './enqueue';
import { parseJobListingFromUrl } from './parse-listing';

const longPageText = 'We are hiring a senior data scientist. '.repeat(20);

describe('assembleJobDescriptionMarkdown', () => {
  it('omits source and sets collectedAt from the caller', () => {
    const markdown = assembleJobDescriptionMarkdown({
      title: 'Senior Data Scientist',
      seniority: 'senior',
      roleFamily: 'data_science',
      body: 'Lead modelling across credit risk.',
      collectedAt: '2026-07-18T10:00:00.000Z',
    });

    expect(markdown).toContain('collectedAt: 2026-07-18T10:00:00.000Z');
    expect(markdown).toContain('title: Senior Data Scientist');
    expect(markdown).toContain('seniority: senior');
    expect(markdown).toContain('roleFamily: data_science');
    expect(markdown).not.toContain('source:');
    expect(markdown).toContain('Lead modelling across credit risk.');
  });

  it('drops invalid enum values from model output', () => {
    expect(
      normaliseExtraction({
        title: 'Analyst',
        body: 'Do analysis.',
        seniority: 'staff',
        roleFamily: 'data_science',
      }),
    ).toEqual({
      title: 'Analyst',
      body: 'Do analysis.',
      seniority: undefined,
      roleFamily: 'data_science',
    });
  });
});

describe('parseJobListingFromUrl', () => {
  it('fails fast on unfetchable URLs without calling Bedrock', async () => {
    const converse = vi.fn();
    const createScrapeCandidate = vi.fn();

    const result = await parseJobListingFromUrl('http://example.com/job', {
      modelId: 'qwen.qwen3-32b-v1:0',
      converse,
      fetch: {
        fetchHttp: vi.fn(),
        resolveHostAddresses: async () => ['8.8.8.8'],
      },
      enqueue: {
        putCandidateObject: vi.fn(),
        createScrapeCandidate,
      },
    });

    expect(result.status).toBe('unfetchable');
    expect(converse).not.toHaveBeenCalled();
    expect(createScrapeCandidate).not.toHaveBeenCalled();
  });

  it('extracts, validates, enqueues, and returns token cost metrics', async () => {
    const putCandidateObject = vi.fn<PutCandidateObject>(async () => undefined);
    const createScrapeCandidate = vi.fn<CreateScrapeCandidate>(async (input) => ({
      id: 'cand-1',
      ...input,
    }));

    const result = await parseJobListingFromUrl(
      'https://boards.greenhouse.io/acme/jobs/1',
      {
        modelId: 'qwen.qwen3-32b-v1:0',
        fetch: {
          fetchHttp: async () => {
            const body = `<html><body>${longPageText}</body></html>`;
            const encoded = new TextEncoder().encode(body);
            return {
              status: 200,
              url: 'https://boards.greenhouse.io/acme/jobs/1',
              headers: {
                get(name: string) {
                  return name.toLowerCase() === 'content-type'
                    ? 'text/html'
                    : null;
                },
              },
              async arrayBuffer() {
                return encoded.buffer.slice(
                  encoded.byteOffset,
                  encoded.byteOffset + encoded.byteLength,
                );
              },
            };
          },
          resolveHostAddresses: async () => ['8.8.8.8'],
        },
        converse: async () => ({
          output: {
            message: {
              content: [
                {
                  toolUse: {
                    name: EXTRACT_TOOL_NAME,
                    input: {
                      title: 'Senior Data Scientist',
                      seniority: 'senior',
                      roleFamily: 'data_science',
                      body: 'Lead modelling across credit risk portfolios.',
                    },
                  },
                },
              ],
            },
          },
          usage: { inputTokens: 3600, outputTokens: 1000 },
        }),
        enqueue: {
          putCandidateObject,
          createScrapeCandidate,
          now: () => new Date('2026-07-18T10:00:00.000Z'),
        },
      },
    );

    expect(result.status).toBe('enqueued');
    expect(result.candidateId).toBe('cand-1');
    expect(result.previewTitle).toBe('Senior Data Scientist');
    expect(result.inputTokens).toBe(3600);
    expect(result.outputTokens).toBe(1000);
    expect(result.estimatedCostUsd).toBeCloseTo(
      estimateHaikuCostUsd(3600, 1000),
      8,
    );
    expect(putCandidateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(/^candidates\/.+\.md$/),
        body: expect.stringContaining('collectedAt: 2026-07-18T10:00:00.000Z'),
      }),
    );
    const putCall = putCandidateObject.mock.calls[0];
    expect(putCall).toBeDefined();
    expect(putCall![0].body).not.toContain('source:');
    expect(createScrapeCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        title: 'Senior Data Scientist',
      }),
    );
    const createCall = createScrapeCandidate.mock.calls[0];
    expect(createCall).toBeDefined();
    expect(createCall![0].source).toBeUndefined();
  });

  it('returns extract_failed when the model payload is invalid', async () => {
    const result = await parseJobListingFromUrl(
      'https://boards.greenhouse.io/acme/jobs/1',
      {
        modelId: 'qwen.qwen3-32b-v1:0',
        fetch: {
          fetchHttp: async () => {
            const body = `<html><body>${longPageText}</body></html>`;
            const encoded = new TextEncoder().encode(body);
            return {
              status: 200,
              url: 'https://boards.greenhouse.io/acme/jobs/1',
              headers: {
                get(name: string) {
                  return name.toLowerCase() === 'content-type'
                    ? 'text/html'
                    : null;
                },
              },
              async arrayBuffer() {
                return encoded.buffer.slice(
                  encoded.byteOffset,
                  encoded.byteOffset + encoded.byteLength,
                );
              },
            };
          },
          resolveHostAddresses: async () => ['8.8.8.8'],
        },
        converse: async () => ({
          output: { message: { content: [] } },
          usage: { inputTokens: 100, outputTokens: 10 },
        }),
        enqueue: {
          putCandidateObject: vi.fn(),
          createScrapeCandidate: vi.fn(),
        },
      },
    );

    expect(result.status).toBe('extract_failed');
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(10);
  });

  it('skips fetch and extracts from pasted page text', async () => {
    const fetchHttp = vi.fn();
    const putCandidateObject = vi.fn<PutCandidateObject>(async () => undefined);
    const createScrapeCandidate = vi.fn<CreateScrapeCandidate>(async (input) => ({
      id: 'cand-paste',
      ...input,
    }));

    const result = await parseJobListingFromUrl(
      {
        url: 'https://careers.mckinsey.com/jobs/1',
        pageText: longPageText,
      },
      {
        modelId: 'qwen.qwen3-32b-v1:0',
        fetch: {
          fetchHttp,
          resolveHostAddresses: async () => ['8.8.8.8'],
        },
        converse: async () => ({
          output: {
            message: {
              content: [
                {
                  toolUse: {
                    name: EXTRACT_TOOL_NAME,
                    input: {
                      title: 'Associate',
                      seniority: 'mid',
                      roleFamily: 'other',
                      body: 'Client delivery role.',
                    },
                  },
                },
              ],
            },
          },
          usage: { inputTokens: 400, outputTokens: 80 },
        }),
        enqueue: { putCandidateObject, createScrapeCandidate },
      },
    );

    expect(fetchHttp).not.toHaveBeenCalled();
    expect(result.status).toBe('enqueued');
    expect(result.candidateId).toBe('cand-paste');
    expect(result.estimatedCostUsd).toBe(estimateHaikuCostUsd(400, 80));
  });
});
