import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_MAX_ACTIVE_DOCS,
  startRecompute,
  type AnalysisRunRecord,
} from './orchestrator';

describe('startRecompute', () => {
  it('rejects a second start while a run is queued or running (single-flight)', async () => {
    const runs: AnalysisRunRecord[] = [
      {
        id: 'run-1',
        status: 'running',
        createdAt: '2026-07-14T10:00:00.000Z',
      },
    ];

    const result = await startRecompute({
      listInFlightRuns: async () =>
        runs.filter((run) => run.status === 'queued' || run.status === 'running'),
      countActiveDocuments: async () => 3,
      createRun: vi.fn(),
      invokeWorker: vi.fn(),
    });

    expect(result).toEqual({
      status: 'rejected',
      reason: 'An analysis run is already in progress',
    });
  });

  it('refuses recompute when the active corpus exceeds the document cap', async () => {
    const result = await startRecompute({
      listInFlightRuns: async () => [],
      countActiveDocuments: async () => DEFAULT_MAX_ACTIVE_DOCS + 1,
      createRun: vi.fn(),
      invokeWorker: vi.fn(),
    });

    expect(result).toEqual({
      status: 'rejected',
      reason: `Active corpus exceeds the ${DEFAULT_MAX_ACTIVE_DOCS}-document cap (${DEFAULT_MAX_ACTIVE_DOCS + 1} active)`,
    });
  });

  it('starts a queued run and invokes the worker when the corpus is within caps', async () => {
    const createRun = vi.fn(async (run: AnalysisRunRecord) => run);
    const invokeWorker = vi.fn(async () => undefined);

    const result = await startRecompute({
      listInFlightRuns: async () => [],
      countActiveDocuments: async () => 2,
      createRun,
      invokeWorker,
      now: new Date('2026-07-14T12:00:00.000Z'),
      createId: () => 'run-new',
    });

    expect(result).toEqual({
      status: 'started',
      run: {
        id: 'run-new',
        status: 'queued',
        createdAt: '2026-07-14T12:00:00.000Z',
      },
    });
    expect(createRun).toHaveBeenCalledOnce();
    expect(invokeWorker).toHaveBeenCalledWith('run-new');
  });
});
