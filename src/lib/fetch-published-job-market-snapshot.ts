import type { JobMarketSnapshot } from './job-market-lab';

export type PublishedJobMarketQuery = {
  getPublishedJobMarketSnapshot: () => Promise<{
    data: unknown;
    errors?: Array<{ message: string }>;
  }>;
};

/** Amplify client shape limited to the guest-safe published query. */
export type AmplifyPublishedSnapshotClient = {
  queries: {
    getPublishedJobMarketSnapshot: () => Promise<{
      data: unknown;
      errors?: Array<{ message: string }>;
    }>;
  };
};

/** Builds a query seam that only calls getPublishedJobMarketSnapshot — never model list APIs. */
export function publishedQueryFromClient(
  client: AmplifyPublishedSnapshotClient,
): PublishedJobMarketQuery {
  return {
    getPublishedJobMarketSnapshot: () =>
      client.queries.getPublishedJobMarketSnapshot(),
  };
}

export async function fetchPublishedSnapshotViaQuery(
  query: PublishedJobMarketQuery,
): Promise<JobMarketSnapshot | null> {
  const { data, errors } = await query.getPublishedJobMarketSnapshot();

  if (errors?.length || data == null) {
    return null;
  }

  if (typeof data === 'object' && !Array.isArray(data)) {
    return data as JobMarketSnapshot;
  }

  if (typeof data === 'string') {
    try {
      const parsed: unknown = JSON.parse(data);
      if (typeof parsed === 'object' && parsed != null && !Array.isArray(parsed)) {
        return parsed as JobMarketSnapshot;
      }
    } catch {
      return null;
    }
  }

  return null;
}
