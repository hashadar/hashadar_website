'use client';

import { JobMarketLabRunsPanel } from '@/components/sections/labs/job-market-lab-runs-panel';
import type { ListAnalysisRunsDeps, StartJobMarketRecompute } from '@/lib/job-market-lab';

export type JobMarketConsoleRunsPageProps = {
  analysisRuns?: ListAnalysisRunsDeps;
  startRecompute?: StartJobMarketRecompute;
};

export function JobMarketConsoleRunsPage({
  analysisRuns,
  startRecompute,
}: JobMarketConsoleRunsPageProps) {
  return (
    <JobMarketLabRunsPanel
      analysisRuns={analysisRuns}
      startRecompute={startRecompute}
    />
  );
}
