import { describe, expect, it } from 'vitest';
import {
  createAmplifyAnalysisRunDeps,
  type AmplifyAnalysisRunModelClient,
  type AmplifyAnalysisRunRow,
} from './job-market-analysis-runs-amplify';
import { getAnalysisRun, listAnalysisRuns } from './job-market-analysis-runs';

function createMemoryClient(
  rows: AmplifyAnalysisRunRow[],
): AmplifyAnalysisRunModelClient {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return {
    async get({ id }) {
      return { data: byId.get(id) ?? null };
    },
    async list() {
      return { data: [...byId.values()] };
    },
  };
}

describe('createAmplifyAnalysisRunDeps', () => {
  it('lists and loads analysis runs through the Amplify model client seam', async () => {
    const deps = createAmplifyAnalysisRunDeps(
      createMemoryClient([
        {
          id: 'run-1',
          status: 'failed',
          errorMessage: 'Worker timed out',
          createdAt: '2026-07-04T09:00:00.000Z',
          updatedAt: '2026-07-04T09:10:00.000Z',
        },
      ]),
    );

    const listed = await listAnalysisRuns(deps);
    expect(listed).toEqual([
      {
        id: 'run-1',
        status: 'failed',
        errorMessage: 'Worker timed out',
        createdAt: '2026-07-04T09:00:00.000Z',
        updatedAt: '2026-07-04T09:10:00.000Z',
        docsConsidered: undefined,
        docsEmbedded: undefined,
        docsCacheHit: undefined,
        clusterCount: undefined,
        bedrockInputTokens: undefined,
        estimatedCostUsd: undefined,
      },
    ]);

    const single = await getAnalysisRun('run-1', deps);
    expect(single?.errorMessage).toBe('Worker timed out');
  });
});
