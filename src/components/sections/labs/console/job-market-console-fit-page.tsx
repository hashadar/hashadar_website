'use client';

import { JobMarketFitWorkspace } from '@/components/sections/labs/console/fit/job-market-fit-workspace';
import type { AmplifyCorpusDeps } from '@/lib/job-market-corpus-amplify';
import type { CanonicalCvDeps } from '@/lib/canonical-cv';

export type JobMarketConsoleFitPageProps = {
  corpus?: AmplifyCorpusDeps;
  canonicalCv?: CanonicalCvDeps;
};

export function JobMarketConsoleFitPage({
  corpus,
  canonicalCv,
}: JobMarketConsoleFitPageProps) {
  return <JobMarketFitWorkspace corpus={corpus} canonicalCv={canonicalCv} />;
}
