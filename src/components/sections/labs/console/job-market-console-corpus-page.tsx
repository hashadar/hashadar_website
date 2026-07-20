'use client';

import { JobMarketCorpusWorkspace } from '@/components/sections/labs/console/corpus/job-market-corpus-workspace';
import type { AmplifyCorpusDeps } from '@/lib/job-market-corpus-amplify';
import type { AmplifyEmployerDeps } from '@/lib/job-market-employers-amplify';
import type { FetchJobDescriptionMarkdownDeps } from '@/lib/fetch-job-description-markdown';
import type { UploadJobDescriptionDeps } from '@/lib/upload-job-description';
import type { ScrapeCandidateRecord } from '@/lib/scrape-candidates';
import type { AnalysisRunRecord } from '@/lib/job-market-analysis-runs';

export type JobMarketConsoleCorpusPageProps = {
  corpus?: AmplifyCorpusDeps;
  employers?: AmplifyEmployerDeps;
  markdownDeps?: FetchJobDescriptionMarkdownDeps;
  uploadDeps?: UploadJobDescriptionDeps;
  listPendingCandidates?: () => Promise<ScrapeCandidateRecord[]>;
  listRuns?: () => Promise<AnalysisRunRecord[]>;
};

export function JobMarketConsoleCorpusPage({
  corpus,
  employers,
  markdownDeps,
  uploadDeps,
  listPendingCandidates,
  listRuns,
}: JobMarketConsoleCorpusPageProps) {
  return (
    <JobMarketCorpusWorkspace
      corpus={corpus}
      employers={employers}
      markdownDeps={markdownDeps}
      uploadDeps={uploadDeps}
      listPendingCandidates={listPendingCandidates}
      listRuns={listRuns}
    />
  );
}
