'use client';

import { JobMarketLabComparePanel } from '@/components/sections/labs/job-market-lab-compare-panel';
import { JobMarketLabCvPanel } from '@/components/sections/labs/job-market-lab-cv-panel';
import { JobMarketLabMarketComparePanel } from '@/components/sections/labs/job-market-lab-market-compare-panel';
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
  return (
    <>
      <JobMarketLabCvPanel canonicalCv={canonicalCv} />
      <JobMarketLabComparePanel canonicalCv={canonicalCv} corpus={corpus} />
      <JobMarketLabMarketComparePanel canonicalCv={canonicalCv} />
    </>
  );
}
