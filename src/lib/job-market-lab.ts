import { defaultStartJobMarketRecompute } from './start-job-market-recompute-client';

export type SkillFrequency = {
  name: string;
  count: number;
};

export type TaxonomyBucket = {
  name: string;
  count: number;
};

export type ClusterSummary = {
  id: number;
  size: number;
  label: string;
};

export type ProjectionPoint = {
  x: number;
  y: number;
  clusterId: number;
};

export type JobMarketSnapshot = {
  documentCount: number;
  publishedAt: string;
  skills: SkillFrequency[];
  seniority: TaxonomyBucket[];
  roleFamily: TaxonomyBucket[];
  clusters: ClusterSummary[];
  projection: ProjectionPoint[];
};

export type PublishedJobMarketResult =
  | { status: 'empty' }
  | { status: 'published'; snapshot: JobMarketSnapshot };

export type FetchPublishedJobMarketSnapshot = () => Promise<JobMarketSnapshot | null>;

export type GetPublishedJobMarketSnapshotDeps = {
  fetchPublished?: FetchPublishedJobMarketSnapshot;
};

export type StartJobMarketRecomputeResult =
  | { status: 'started'; runId: string }
  | { status: 'rejected'; reason: string };

export type StartJobMarketRecompute = () => Promise<StartJobMarketRecomputeResult>;

export type StartJobMarketRecomputeDeps = {
  startRecompute?: StartJobMarketRecompute;
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

function sanitizeSnapshot(snapshot: JobMarketSnapshot): JobMarketSnapshot {
  return {
    documentCount: snapshot.documentCount,
    publishedAt: snapshot.publishedAt,
    skills: snapshot.skills ?? [],
    seniority: snapshot.seniority ?? [],
    roleFamily: snapshot.roleFamily ?? [],
    clusters: snapshot.clusters ?? [],
    projection: snapshot.projection ?? [],
  };
}

async function defaultFetchPublished(): Promise<JobMarketSnapshot | null> {
  // Wiring to Amplify getPublishedJobMarketSnapshot lands with sandbox/outputs.
  return null;
}

async function defaultStartRecompute(): Promise<StartJobMarketRecomputeResult> {
  return defaultStartJobMarketRecompute();
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
    snapshot: sanitizeSnapshot(snapshot),
  };
}

export async function startJobMarketRecompute(
  deps: StartJobMarketRecomputeDeps = {},
): Promise<StartJobMarketRecomputeResult> {
  const start = deps.startRecompute ?? defaultStartRecompute;
  return start();
}
