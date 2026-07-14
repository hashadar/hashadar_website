import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { configureSiteAmplify } from './configure-site-amplify';
import {
  fetchPublishedSnapshotViaQuery,
  publishedQueryFromClient,
  type AmplifyPublishedSnapshotClient,
} from './fetch-published-job-market-snapshot';
import { readAmplifyOutputs } from './read-amplify-outputs';
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
  technologies?: SkillFrequency[];
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

export {
  createAmplifyCorpusDeps,
  createDefaultAmplifyCorpusDeps,
  type AmplifyCorpusDeps,
} from './job-market-corpus-amplify';

export {
  listAnalysisRuns,
  getAnalysisRun,
  type AnalysisRunRecord,
  type AnalysisRunStatus,
  type ListAnalysisRunsDeps,
  type GetAnalysisRunDeps,
} from './job-market-analysis-runs';

export {
  createAmplifyAnalysisRunDeps,
  createDefaultAmplifyAnalysisRunDeps,
  type AmplifyAnalysisRunModelClient,
} from './job-market-analysis-runs-amplify';

function sanitizeSnapshot(snapshot: JobMarketSnapshot): JobMarketSnapshot {
  const technologies = snapshot.technologies ?? snapshot.skills ?? [];
  const sanitised: JobMarketSnapshot = {
    documentCount: snapshot.documentCount,
    publishedAt: snapshot.publishedAt,
    technologies,
    skills: technologies,
    seniority: snapshot.seniority ?? [],
    roleFamily: snapshot.roleFamily ?? [],
    clusters: snapshot.clusters ?? [],
    projection: snapshot.projection ?? [],
  };

  return sanitised;
}

async function defaultFetchPublished(): Promise<JobMarketSnapshot | null> {
  try {
    const outputs = readAmplifyOutputs();
    if (!outputs) {
      return null;
    }

    configureSiteAmplify(outputs, (config, options) => {
      Amplify.configure(config, options);
    });

    // Guest-safe auth: default data mode is userPool; allow.guest needs identityPool.
    const client = generateClient({
      authMode: 'identityPool',
    }) as AmplifyPublishedSnapshotClient;

    return fetchPublishedSnapshotViaQuery(publishedQueryFromClient(client));
  } catch {
    return null;
  }
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

export {
  uploadJobDescription,
  type UploadJobDescriptionResult,
  type UploadJobDescriptionDeps,
  type PutRawObject,
} from './upload-job-description';

export { validateJobDescriptionMarkdown } from './validate-job-description-markdown';

export {
  acceptScrapeCandidate,
  enqueueScrapeCandidate,
  listPendingScrapeCandidates,
  listScrapeCandidates,
  rejectScrapeCandidate,
  type AcceptScrapeCandidateOptions,
  type AcceptScrapeCandidateResult,
  type AssistWithLlm,
  type EnqueueScrapeCandidateResult,
  type RejectScrapeCandidateResult,
  type ScrapeCandidateLlmEnrichment,
  type ScrapeCandidateRecord,
  type ScrapeCandidateStatus,
} from './scrape-candidates';

export { defaultAssistWithLlm } from './scrape-candidates-llm-assist';

export {
  createAmplifyScrapeCandidateDeps,
  createDefaultAmplifyScrapeCandidateDeps,
  type AmplifyScrapeCandidateModelClient,
} from './scrape-candidates-amplify';

export { createDefaultPutCandidateObject } from './scrape-candidates-client';

export {
  listThemeLabelOverrides,
  setThemeLabelOverride,
  type ThemeLabelOverrideRecord,
  type ListThemeLabelOverridesDeps,
  type SetThemeLabelOverrideDeps,
} from './job-market-theme-labels';

export {
  createAmplifyThemeLabelOverrideDeps,
  createDefaultAmplifyThemeLabelOverrideDeps,
  type AmplifyThemeLabelOverrideModelClient,
} from './job-market-theme-labels-amplify';

export {
  createEmployer,
  updateEmployer,
  listEmployers,
  updateJobDescriptionStructuredFields,
  EMPLOYER_SIZE_TIERS,
  EMPLOYER_PRESTIGE_TIERS,
  JOB_DESCRIPTION_SENIORITIES,
  JOB_DESCRIPTION_ROLE_FAMILIES,
  COMPENSATION_PERIODS,
  type EmployerRecord,
  type EmployerSizeTier,
  type EmployerPrestigeTier,
  type JobDescriptionSeniority,
  type JobDescriptionRoleFamily,
  type CompensationPeriod,
  type JobDescriptionStructuredFieldsPatch,
  type UpdateJobDescriptionStructuredFieldsDeps,
} from './job-market-employers';

export {
  createAmplifyEmployerDeps,
  createDefaultAmplifyEmployerDeps,
  createAmplifyMetadataDeps,
  createDefaultAmplifyMetadataDeps,
  type AmplifyEmployerDeps,
} from './job-market-employers-amplify';

export {
  getOwnerPayPrestigeAnalytics,
  type OwnerPayPrestigeAnalytics,
  type GetOwnerPayPrestigeAnalyticsDeps,
  type MissingDataRate,
  type TierBucket,
  type CompensationCurrencySummary,
} from './job-market-pay-prestige-analytics';

export {
  createAmplifyPayPrestigeAnalyticsDeps,
  createDefaultAmplifyPayPrestigeAnalyticsDeps,
  type AmplifyPayPrestigeAnalyticsDeps,
} from './job-market-pay-prestige-analytics-amplify';

