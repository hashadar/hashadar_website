import { describe, expect, it } from 'vitest';
import {
  startJobMarketRecomputeViaMutation,
  type StartJobMarketRecomputeMutation,
} from './start-job-market-recompute-client';

describe('startJobMarketRecomputeViaMutation', () => {
  it('returns started with runId when the mutation starts a run', async () => {
    const mutation: StartJobMarketRecomputeMutation = {
      startJobMarketRecompute: async () => ({
        data: { status: 'started', runId: 'run-abc' },
      }),
    };

    const result = await startJobMarketRecomputeViaMutation(mutation);

    expect(result).toEqual({ status: 'started', runId: 'run-abc' });
  });

  it('returns rejected with reason when a run is already in progress', async () => {
    const mutation: StartJobMarketRecomputeMutation = {
      startJobMarketRecompute: async () => ({
        data: {
          status: 'rejected',
          reason: 'An analysis run is already in progress',
        },
      }),
    };

    const result = await startJobMarketRecomputeViaMutation(mutation);

    expect(result).toEqual({
      status: 'rejected',
      reason: 'An analysis run is already in progress',
    });
  });

  it('returns rejected with reason when the active corpus is over cap', async () => {
    const mutation: StartJobMarketRecomputeMutation = {
      startJobMarketRecompute: async () => ({
        data: {
          status: 'rejected',
          reason: 'Active corpus exceeds the 150-document cap (151 active)',
        },
      }),
    };

    const result = await startJobMarketRecomputeViaMutation(mutation);

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Active corpus exceeds the 150-document cap (151 active)',
    });
  });

  it('rejects clearly when Amplify reports an unauthenticated error', async () => {
    const mutation: StartJobMarketRecomputeMutation = {
      startJobMarketRecompute: async () => ({
        data: null,
        errors: [{ message: 'No current user' }],
      }),
    };

    const result = await startJobMarketRecomputeViaMutation(mutation);

    expect(result).toEqual({
      status: 'rejected',
      reason: 'You must be signed in to start a recompute.',
    });
  });
});
