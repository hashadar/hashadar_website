import { Amplify } from 'aws-amplify';
import type { StartJobMarketRecomputeResult } from './job-market-lab';

export type StartJobMarketRecomputeMutationResult = {
  status: string;
  runId?: string | null;
  reason?: string | null;
};

export type StartJobMarketRecomputeMutation = {
  startJobMarketRecompute: () => Promise<{
    data?: StartJobMarketRecomputeMutationResult | null;
    errors?: Array<{ message: string }>;
  }>;
};

/** Amplify client shape limited to the authenticated start mutation. */
export type AmplifyStartRecomputeClient = {
  mutations: {
    startJobMarketRecompute: () => Promise<{
      data?: StartJobMarketRecomputeMutationResult | null;
      errors?: Array<{ message: string }>;
    }>;
  };
};

export const RECOMPUTE_UNAUTHENTICATED_REASON =
  'You must be signed in to start a recompute.';

export const RECOMPUTE_CLIENT_NOT_CONFIGURED_REASON =
  'Recompute client is not configured';

export const RECOMPUTE_FAILED_REASON =
  'Unable to start recompute. Please try again.';

function isUnauthenticatedError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('no current user') ||
    lower.includes('not authorized') ||
    lower.includes('unauthorised') ||
    lower.includes('unauthorized') ||
    lower.includes('not authenticated') ||
    lower.includes('user is not authenticated')
  );
}

export function isAmplifyClientConfigured(
  getConfig: () => object = () => Amplify.getConfig(),
): boolean {
  return Object.keys(getConfig()).length > 0;
}

/** Builds a mutation seam that only calls startJobMarketRecompute. */
export function startMutationFromClient(
  client: AmplifyStartRecomputeClient,
): StartJobMarketRecomputeMutation {
  return {
    startJobMarketRecompute: () => client.mutations.startJobMarketRecompute(),
  };
}

export async function startJobMarketRecomputeViaMutation(
  mutation: StartJobMarketRecomputeMutation,
): Promise<StartJobMarketRecomputeResult> {
  try {
    const { data, errors } = await mutation.startJobMarketRecompute();

    if (errors?.length) {
      if (errors.some((error) => isUnauthenticatedError(error.message))) {
        return { status: 'rejected', reason: RECOMPUTE_UNAUTHENTICATED_REASON };
      }
      return {
        status: 'rejected',
        reason: errors[0]?.message ?? RECOMPUTE_FAILED_REASON,
      };
    }

    if (data == null) {
      return { status: 'rejected', reason: RECOMPUTE_FAILED_REASON };
    }

    if (data.status === 'started' && data.runId) {
      return { status: 'started', runId: data.runId };
    }

    if (data.status === 'rejected') {
      return {
        status: 'rejected',
        reason: data.reason?.trim() || RECOMPUTE_FAILED_REASON,
      };
    }

    return { status: 'rejected', reason: RECOMPUTE_FAILED_REASON };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (isUnauthenticatedError(message)) {
      return { status: 'rejected', reason: RECOMPUTE_UNAUTHENTICATED_REASON };
    }
    return { status: 'rejected', reason: RECOMPUTE_FAILED_REASON };
  }
}

/**
 * Client-safe default start path. Relies on AmplifyProvider having configured
 * Amplify already — avoids node:fs / readAmplifyOutputs in the browser bundle.
 */
export async function defaultStartJobMarketRecompute(): Promise<StartJobMarketRecomputeResult> {
  if (!isAmplifyClientConfigured()) {
    return {
      status: 'rejected',
      reason: RECOMPUTE_CLIENT_NOT_CONFIGURED_REASON,
    };
  }

  try {
    const { generateClient } = await import('aws-amplify/data');
    const client = generateClient({
      authMode: 'userPool',
    }) as AmplifyStartRecomputeClient;

    return startJobMarketRecomputeViaMutation(startMutationFromClient(client));
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (isUnauthenticatedError(message)) {
      return { status: 'rejected', reason: RECOMPUTE_UNAUTHENTICATED_REASON };
    }
    return { status: 'rejected', reason: RECOMPUTE_FAILED_REASON };
  }
}
