export type JobMarketSnapshot = {
  documentCount: number;
  publishedAt: string;
};

export type PublishedJobMarketResult =
  | { status: 'empty' }
  | { status: 'published'; snapshot: JobMarketSnapshot };

export type FetchPublishedJobMarketSnapshot = () => Promise<JobMarketSnapshot | null>;

export type GetPublishedJobMarketSnapshotDeps = {
  fetchPublished?: FetchPublishedJobMarketSnapshot;
};

async function defaultFetchPublished(): Promise<JobMarketSnapshot | null> {
  // Guest publication query lands in a later slice; until then nothing is published.
  return null;
}

export async function getPublishedJobMarketSnapshot(
  deps: GetPublishedJobMarketSnapshotDeps = {},
): Promise<PublishedJobMarketResult> {
  const fetchPublished = deps.fetchPublished ?? defaultFetchPublished;
  const snapshot = await fetchPublished();

  if (snapshot == null) {
    return { status: 'empty' };
  }

  return {
    status: 'published',
    snapshot: {
      documentCount: snapshot.documentCount,
      publishedAt: snapshot.publishedAt,
    },
  };
}
