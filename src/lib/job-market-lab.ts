import { generateClient } from 'aws-amplify/data';
import {
  fetchPublishedSnapshotViaQuery,
  publishedQueryFromClient,
  type AmplifyPublishedSnapshotClient,
} from './fetch-published-job-market-snapshot';
import {
  defaultStartJobMarketRecompute,
  isAmplifyClientConfigured,
} from './start-job-market-recompute-client';
import type { JobMarketPublicCorpusMeta } from './job-market-pulse-filters';

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
  corpusMeta?: JobMarketPublicCorpusMeta;
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

function sanitisePublicCorpusMeta(value: unknown): JobMarketPublicCorpusMeta | undefined {
  if (typeof value !== 'object' || value == null || !('documents' in value)) {
    return undefined;
  }

  const record = value as { documents?: unknown };
  if (!Array.isArray(record.documents)) {
    return undefined;
  }

  const documents = record.documents
    .map((item) => {
      if (typeof item !== 'object' || item == null) {
        return null;
      }
      const doc = item as Record<string, unknown>;
      if (typeof doc.id !== 'string' || typeof doc.collectedAt !== 'string') {
        return null;
      }
      if (typeof doc.clusterId !== 'number' || !Array.isArray(doc.technologies)) {
        return null;
      }
      return {
        id: doc.id,
        collectedAt: doc.collectedAt,
        technologies: doc.technologies.filter((tech): tech is string => typeof tech === 'string'),
        clusterId: doc.clusterId,
        projectionX: typeof doc.projectionX === 'number' ? doc.projectionX : undefined,
        projectionY: typeof doc.projectionY === 'number' ? doc.projectionY : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  return documents.length > 0 ? { documents } : undefined;
}

function sanitiseSnapshot(snapshot: JobMarketSnapshot): JobMarketSnapshot {
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

  const corpusMeta = sanitisePublicCorpusMeta(snapshot.corpusMeta);
  if (corpusMeta) {
    sanitised.corpusMeta = corpusMeta;
  }

  return sanitised;
}

/**
 * Client- and server-safe default. Relies on Amplify already being configured
 * (layout AmplifyProvider on the client, or ensureSiteAmplifyFromOutputs on RSC)
 * so this module never imports node:fs / readAmplifyOutputs.
 */
async function defaultFetchPublished(): Promise<JobMarketSnapshot | null> {
  try {
    if (!isAmplifyClientConfigured()) {
      return null;
    }

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
    snapshot: sanitiseSnapshot(snapshot),
  };
}

export async function startJobMarketRecompute(
  deps: StartJobMarketRecomputeDeps = {},
): Promise<StartJobMarketRecomputeResult> {
  const start = deps.startRecompute ?? defaultStartRecompute;
  return start();
}

export {
  compareCvToJobDescription,
  type CompareCvToJobDescriptionInput,
  type CvJdComparisonItem,
  type CvJdComparisonResult,
  type CvJdComparisonTemplates,
} from './compare-cv-to-job-description';

export {
  compareCvToMarket,
  type CompareCvToMarketInput,
} from './compare-cv-to-market';

export {
  fetchJobDescriptionMarkdown,
  type FetchJobDescriptionMarkdownDeps,
} from './fetch-job-description-markdown';

export {
  matchTechnologiesInText,
  FINSERV_AI_TECHNOLOGY_DICTIONARY,
  type TechnologyEntry,
} from './technology-ontology';

export {
  uploadJobDescription,
  overwriteJobDescriptionMarkdown,
  type UploadJobDescriptionResult,
  type UploadJobDescriptionDeps,
  type PutRawObject,
} from './upload-job-description';

export { validateJobDescriptionMarkdown } from './validate-job-description-markdown';

export {
  parseJobListingFromUrl,
  type ParseJobListingDeps,
  type ParseJobListingFromUrl,
  type ParseJobListingFromUrlResult,
  type ParseJobListingStatus,
} from './parse-job-listing';

export {
  defaultParseJobListingFromUrl,
  parseJobListingFromUrlViaMutation,
  parseListingMutationFromClient,
  type AmplifyParseJobListingClient,
  type ParseJobListingMutation,
} from './parse-job-listing-client';

export {
  acceptScrapeCandidate,
  applyOwnerMetadata,
  enqueueScrapeCandidate,
  listPendingScrapeCandidates,
  listScrapeCandidates,
  rejectScrapeCandidate,
  type AcceptScrapeCandidateOptions,
  type AcceptScrapeCandidateResult,
  type ApplyOwnerMetadataResult,
  type AssistWithLlm,
  type EnqueueScrapeCandidateResult,
  type OwnerCandidateMetadataInput,
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

export {
  filterJobMarketPulse,
  sanitiseFilterSelection,
  toPublicCorpusMeta,
  OWNER_PULSE_FILTER_DIMENSIONS,
  PUBLIC_PULSE_FILTER_DIMENSIONS,
  type FilteredJobMarketPulse,
  type FilterJobMarketPulseOptions,
  type JobMarketCorpusMeta,
  type JobMarketDocumentPulseMeta,
  type JobMarketPublicCorpusMeta,
  type JobMarketPulseFilterSelection,
  type JobMarketPulseInput,
  type JobMarketPulseTimeWindow,
} from './job-market-pulse-filters';

export {
  fetchOwnerJobMarketPulseSource,
  type FetchOwnerJobMarketPulseSource,
  type FetchOwnerJobMarketPulseSourceDeps,
  type OwnerJobMarketPulseSource,
} from './fetch-owner-job-market-pulse';

