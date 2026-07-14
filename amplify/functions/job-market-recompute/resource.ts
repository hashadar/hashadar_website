import { defineFunction } from '@aws-amplify/backend';

/**
 * Owner-only on-demand recompute orchestrator.
 * Creates an AnalysisRun (single-flight + active-doc caps) and invokes the analyse worker.
 */
export const jobMarketRecompute = defineFunction({
  name: 'job-market-recompute',
  entry: './handler.ts',
  timeoutSeconds: 60,
});
