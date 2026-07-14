export type AnalysisRunStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed';

export type AnalysisRunRecord = {
  id: string;
  status: AnalysisRunStatus;
  createdAt: string;
  docsConsidered?: number;
  docsEmbedded?: number;
  docsCacheHit?: number;
  clusterCount?: number;
  bedrockInputTokens?: number;
  estimatedCostUsd?: number;
  errorMessage?: string;
};

export const DEFAULT_MAX_ACTIVE_DOCS = 150;

export type StartRecomputeResult =
  | { status: 'started'; run: AnalysisRunRecord }
  | { status: 'rejected'; reason: string };

export type StartRecomputeDeps = {
  listInFlightRuns: () => Promise<AnalysisRunRecord[]>;
  countActiveDocuments: () => Promise<number>;
  createRun: (run: AnalysisRunRecord) => Promise<AnalysisRunRecord>;
  invokeWorker: (runId: string) => Promise<void>;
  now?: Date;
  maxActiveDocs?: number;
  createId?: () => string;
};

export async function startRecompute(
  deps: StartRecomputeDeps,
): Promise<StartRecomputeResult> {
  const inFlight = await deps.listInFlightRuns();
  if (inFlight.length > 0) {
    return {
      status: 'rejected',
      reason: 'An analysis run is already in progress',
    };
  }

  const maxActiveDocs = deps.maxActiveDocs ?? DEFAULT_MAX_ACTIVE_DOCS;
  const activeCount = await deps.countActiveDocuments();
  if (activeCount > maxActiveDocs) {
    return {
      status: 'rejected',
      reason: `Active corpus exceeds the ${maxActiveDocs}-document cap (${activeCount} active)`,
    };
  }

  const now = deps.now ?? new Date();
  const run: AnalysisRunRecord = {
    id: deps.createId?.() ?? `run-${now.toISOString()}`,
    status: 'queued',
    createdAt: now.toISOString(),
  };

  const created = await deps.createRun(run);
  await deps.invokeWorker(created.id);

  return { status: 'started', run: created };
}
