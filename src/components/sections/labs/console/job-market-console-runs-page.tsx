'use client';

import { JobMarketLabAdminSection } from '@/components/sections/labs/job-market-lab-admin-section';
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
    <>
      <JobMarketLabAdminSection startRecompute={startRecompute} />
      <JobMarketLabRunsPanel analysisRuns={analysisRuns} />
    </>
  );
}
