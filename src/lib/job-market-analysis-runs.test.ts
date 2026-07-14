import { describe, expect, it } from 'vitest';
import {
  getAnalysisRun,
  listAnalysisRuns,
  type AnalysisRunRecord,
} from './job-market-analysis-runs';

describe('listAnalysisRuns', () => {
  it('returns recent analysis runs with failure reasons for failed runs', async () => {
    const runs: AnalysisRunRecord[] = [
      {
        id: 'run-old',
        status: 'succeeded',
        createdAt: '2026-07-01T10:00:00.000Z',
        updatedAt: '2026-07-01T10:05:00.000Z',
      },
      {
        id: 'run-failed',
        status: 'failed',
        errorMessage: 'Bedrock quota exceeded',
        createdAt: '2026-07-02T10:00:00.000Z',
        updatedAt: '2026-07-02T10:01:00.000Z',
      },
      {
        id: 'run-current',
        status: 'running',
        createdAt: '2026-07-03T10:00:00.000Z',
        updatedAt: '2026-07-03T10:00:30.000Z',
      },
    ];

    const result = await listAnalysisRuns({
      listRuns: async () => runs,
    });

    expect(result.map((run) => run.id)).toEqual([
      'run-current',
      'run-failed',
      'run-old',
    ]);
    expect(result[1]).toMatchObject({
      id: 'run-failed',
      status: 'failed',
      errorMessage: 'Bedrock quota exceeded',
    });
  });
});

describe('getAnalysisRun', () => {
  it('returns a single run by id through the injected seam', async () => {
    const run: AnalysisRunRecord = {
      id: 'run-42',
      status: 'queued',
      createdAt: '2026-07-03T12:00:00.000Z',
    };

    const result = await getAnalysisRun('run-42', {
      getRun: async (id) => (id === 'run-42' ? run : null),
    });

    expect(result).toEqual(run);
  });

  it('returns null when the run is missing', async () => {
    const result = await getAnalysisRun('missing', {
      getRun: async () => null,
    });

    expect(result).toBeNull();
  });
});
