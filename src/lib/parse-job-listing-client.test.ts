import { describe, expect, it } from 'vitest';
import {
  defaultParseJobListingFromUrl,
  parseJobListingFromUrlViaMutation,
  type ParseJobListingMutation,
} from './parse-job-listing-client';

describe('parseJobListingFromUrlViaMutation', () => {
  it('maps an enqueued mutation response', async () => {
    const mutation: ParseJobListingMutation = {
      parseJobListingFromUrl: async () => ({
        data: {
          status: 'enqueued',
          candidateId: 'cand-1',
          previewTitle: 'Senior Data Scientist',
          previewExcerpt: 'Lead modelling…',
          inputTokens: 3600,
          outputTokens: 1000,
          estimatedCostUsd: 0.0086,
        },
      }),
    };

    const result = await parseJobListingFromUrlViaMutation(
      'https://boards.greenhouse.io/acme/jobs/1',
      mutation,
    );

    expect(result).toEqual({
      status: 'enqueued',
      reason: undefined,
      candidateId: 'cand-1',
      previewTitle: 'Senior Data Scientist',
      previewExcerpt: 'Lead modelling…',
      inputTokens: 3600,
      outputTokens: 1000,
      estimatedCostUsd: 0.0086,
    });
  });

  it('maps unfetchable reasons from the fetch gate', async () => {
    const mutation: ParseJobListingMutation = {
      parseJobListingFromUrl: async () => ({
        data: {
          status: 'unfetchable',
          reason: 'The listing page timed out while loading.',
        },
      }),
    };

    const result = await parseJobListingFromUrlViaMutation(
      'https://boards.greenhouse.io/acme/jobs/1',
      mutation,
    );

    expect(result).toEqual({
      status: 'unfetchable',
      reason: 'The listing page timed out while loading.',
      candidateId: undefined,
      previewTitle: undefined,
      previewExcerpt: undefined,
      inputTokens: undefined,
      outputTokens: undefined,
      estimatedCostUsd: undefined,
    });
  });

  it('rejects clearly when Amplify reports an unauthenticated error', async () => {
    const mutation: ParseJobListingMutation = {
      parseJobListingFromUrl: async () => ({
        data: null,
        errors: [{ message: 'No current user' }],
      }),
    };

    const result = await parseJobListingFromUrlViaMutation(
      'https://boards.greenhouse.io/acme/jobs/1',
      mutation,
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'You must be signed in to parse a listing.',
    });
  });

  it('rejects clearly from the default path when Amplify is not configured', async () => {
    const result = await defaultParseJobListingFromUrl(
      'https://boards.greenhouse.io/acme/jobs/1',
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Parse listing client is not configured',
    });
  });
});
