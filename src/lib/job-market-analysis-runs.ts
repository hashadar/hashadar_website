export type AnalysisRunStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type AnalysisRunRecord = {
  id: string;
  status: AnalysisRunStatus;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
  docsConsidered?: number;
  docsEmbedded?: number;
  docsCacheHit?: number;
  clusterCount?: number;
  bedrockInputTokens?: number;
  estimatedCostUsd?: number;
};

export type ListAnalysisRunsDeps = {
  listRuns: () => Promise<AnalysisRunRecord[]>;
};

export type GetAnalysisRunDeps = {
  getRun: (id: string) => Promise<AnalysisRunRecord | null>;
};

function byRecency(a: AnalysisRunRecord, b: AnalysisRunRecord): number {
  const aKey = a.updatedAt ?? a.createdAt ?? '';
  const bKey = b.updatedAt ?? b.createdAt ?? '';
  return bKey.localeCompare(aKey);
}

export async function listAnalysisRuns(
  deps: ListAnalysisRunsDeps,
): Promise<AnalysisRunRecord[]> {
  const runs = await deps.listRuns();
  return [...runs].sort(byRecency);
}

export async function getAnalysisRun(
  id: string,
  deps: GetAnalysisRunDeps,
): Promise<AnalysisRunRecord | null> {
  return deps.getRun(id);
}
