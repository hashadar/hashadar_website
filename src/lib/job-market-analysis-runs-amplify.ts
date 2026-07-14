import type {
  AnalysisRunRecord,
  AnalysisRunStatus,
  GetAnalysisRunDeps,
  ListAnalysisRunsDeps,
} from './job-market-analysis-runs';

export type AmplifyAnalysisRunRow = {
  id: string;
  status: AnalysisRunStatus;
  errorMessage?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  docsConsidered?: number | null;
  docsEmbedded?: number | null;
  docsCacheHit?: number | null;
  clusterCount?: number | null;
  bedrockInputTokens?: number | null;
  estimatedCostUsd?: number | null;
};

type AmplifyDataResult<T> = {
  data: T;
  errors?: Array<{ message: string }> | null;
};

export type AmplifyAnalysisRunModelClient = {
  get: (input: { id: string }) => Promise<AmplifyDataResult<AmplifyAnalysisRunRow | null>>;
  list: () => Promise<AmplifyDataResult<AmplifyAnalysisRunRow[] | null>>;
};

function throwIfErrors(errors: Array<{ message: string }> | null | undefined): void {
  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
}

function toAnalysisRunRecord(row: AmplifyAnalysisRunRow): AnalysisRunRecord {
  return {
    id: row.id,
    status: row.status,
    errorMessage: row.errorMessage ?? undefined,
    createdAt: row.createdAt ?? undefined,
    updatedAt: row.updatedAt ?? undefined,
    docsConsidered: row.docsConsidered ?? undefined,
    docsEmbedded: row.docsEmbedded ?? undefined,
    docsCacheHit: row.docsCacheHit ?? undefined,
    clusterCount: row.clusterCount ?? undefined,
    bedrockInputTokens: row.bedrockInputTokens ?? undefined,
    estimatedCostUsd: row.estimatedCostUsd ?? undefined,
  };
}

export function createAmplifyAnalysisRunDeps(
  client: AmplifyAnalysisRunModelClient,
): ListAnalysisRunsDeps & GetAnalysisRunDeps {
  return {
    async listRuns() {
      const { data, errors } = await client.list();
      throwIfErrors(errors);
      return (data ?? []).map(toAnalysisRunRecord);
    },
    async getRun(id) {
      const { data, errors } = await client.get({ id });
      throwIfErrors(errors);
      return data ? toAnalysisRunRecord(data) : null;
    },
  };
}

export async function createDefaultAmplifyAnalysisRunDeps(): Promise<
  ListAnalysisRunsDeps & GetAnalysisRunDeps
> {
  const { generateClient } = await import('aws-amplify/data');
  const client = generateClient({ authMode: 'userPool' }) as {
    models: {
      AnalysisRun: AmplifyAnalysisRunModelClient;
    };
  };
  return createAmplifyAnalysisRunDeps(client.models.AnalysisRun);
}
