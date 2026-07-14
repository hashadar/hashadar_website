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
