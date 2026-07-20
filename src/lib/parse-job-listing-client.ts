import { isAmplifyClientConfigured } from './start-job-market-recompute-client';

export type ParseJobListingStatus =
  | 'enqueued'
  | 'unfetchable'
  | 'extract_failed'
  | 'rejected';

export type ParseJobListingFromUrlResult = {
  status: ParseJobListingStatus;
  reason?: string;
  candidateId?: string;
  previewTitle?: string;
  previewExcerpt?: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
};

export type ParseJobListingMutationResult = {
  status: string;
  reason?: string | null;
  candidateId?: string | null;
  previewTitle?: string | null;
  previewExcerpt?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  estimatedCostUsd?: number | null;
};

export type ParseJobListingMutationArgs = {
  url: string;
  pageText?: string;
};

export type ParseJobListingMutation = {
  parseJobListingFromUrl: (input: ParseJobListingMutationArgs) => Promise<{
    data?: ParseJobListingMutationResult | null;
    errors?: Array<{ message: string }>;
  }>;
};

export type AmplifyParseJobListingClient = {
  mutations: {
    parseJobListingFromUrl: (input: ParseJobListingMutationArgs) => Promise<{
      data?: ParseJobListingMutationResult | null;
      errors?: Array<{ message: string }>;
    }>;
  };
};

export const PARSE_LISTING_UNAUTHENTICATED_REASON =
  'You must be signed in to parse a listing.';

export const PARSE_LISTING_CLIENT_NOT_CONFIGURED_REASON =
  'Parse listing client is not configured';

export const PARSE_LISTING_FAILED_REASON =
  'Unable to parse the listing. Please try again.';

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

function optionalString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function optionalNumber(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function mapMutationData(
  data: ParseJobListingMutationResult,
): ParseJobListingFromUrlResult {
  const status = data.status as ParseJobListingStatus;
  if (
    status === 'enqueued' ||
    status === 'unfetchable' ||
    status === 'extract_failed' ||
    status === 'rejected'
  ) {
    return {
      status,
      reason: optionalString(data.reason),
      candidateId: optionalString(data.candidateId),
      previewTitle: optionalString(data.previewTitle),
      previewExcerpt: optionalString(data.previewExcerpt),
      inputTokens: optionalNumber(data.inputTokens),
      outputTokens: optionalNumber(data.outputTokens),
      estimatedCostUsd: optionalNumber(data.estimatedCostUsd),
    };
  }

  return { status: 'rejected', reason: PARSE_LISTING_FAILED_REASON };
}

function normaliseInput(
  input: string | ParseJobListingMutationArgs,
): ParseJobListingMutationArgs {
  if (typeof input === 'string') {
    return { url: input };
  }
  return {
    url: input.url,
    ...(input.pageText !== undefined ? { pageText: input.pageText } : {}),
  };
}

/** Builds a mutation seam that only calls parseJobListingFromUrl. */
export function parseListingMutationFromClient(
  client: AmplifyParseJobListingClient,
): ParseJobListingMutation {
  return {
    parseJobListingFromUrl: (input) =>
      client.mutations.parseJobListingFromUrl(input),
  };
}

export async function parseJobListingFromUrlViaMutation(
  input: string | ParseJobListingMutationArgs,
  mutation: ParseJobListingMutation,
): Promise<ParseJobListingFromUrlResult> {
  try {
    const { data, errors } = await mutation.parseJobListingFromUrl(
      normaliseInput(input),
    );

    if (errors?.length) {
      if (errors.some((error) => isUnauthenticatedError(error.message))) {
        return { status: 'rejected', reason: PARSE_LISTING_UNAUTHENTICATED_REASON };
      }
      return {
        status: 'rejected',
        reason: errors[0]?.message ?? PARSE_LISTING_FAILED_REASON,
      };
    }

    if (data == null) {
      return { status: 'rejected', reason: PARSE_LISTING_FAILED_REASON };
    }

    return mapMutationData(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (isUnauthenticatedError(message)) {
      return { status: 'rejected', reason: PARSE_LISTING_UNAUTHENTICATED_REASON };
    }
    return { status: 'rejected', reason: PARSE_LISTING_FAILED_REASON };
  }
}

/**
 * Client-safe default parse path. Relies on AmplifyProvider having configured
 * Amplify already — avoids node:fs / readAmplifyOutputs in the browser bundle.
 */
export async function defaultParseJobListingFromUrl(
  input: string | ParseJobListingMutationArgs,
): Promise<ParseJobListingFromUrlResult> {
  if (!isAmplifyClientConfigured()) {
    return {
      status: 'rejected',
      reason: PARSE_LISTING_CLIENT_NOT_CONFIGURED_REASON,
    };
  }

  try {
    const { generateClient } = await import('aws-amplify/data');
    const client = generateClient({
      authMode: 'userPool',
    }) as AmplifyParseJobListingClient;

    return parseJobListingFromUrlViaMutation(
      input,
      parseListingMutationFromClient(client),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (isUnauthenticatedError(message)) {
      return { status: 'rejected', reason: PARSE_LISTING_UNAUTHENTICATED_REASON };
    }
    return { status: 'rejected', reason: PARSE_LISTING_FAILED_REASON };
  }
}
