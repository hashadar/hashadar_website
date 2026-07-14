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

export {
  archiveJobDescription,
  restoreJobDescription,
  prepareActiveCorpusForAnalysis,
  selectActiveCorpus,
  DEFAULT_MAX_AGE_MONTHS,
  type JobDescriptionCorpusRecord,
  type JobDescriptionStatus,
} from './job-market-corpus';

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
