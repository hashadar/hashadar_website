'use client';

import { JobMarketCorpusWorkspace } from '@/components/sections/labs/console/corpus/job-market-corpus-workspace';
import type { AmplifyCorpusDeps } from '@/lib/job-market-corpus-amplify';
import type { AmplifyEmployerDeps } from '@/lib/job-market-employers-amplify';
import type { FetchJobDescriptionMarkdownDeps } from '@/lib/fetch-job-description-markdown';
import type { UploadJobDescriptionDeps } from '@/lib/upload-job-description';
import type { CorpusUploadFn } from '@/components/sections/labs/console/corpus/job-market-corpus-ingest-toolbar';

export type JobMarketConsoleCorpusPageProps = {
  corpus?: AmplifyCorpusDeps;
  employers?: AmplifyEmployerDeps;
  markdownDeps?: FetchJobDescriptionMarkdownDeps;
  uploadDeps?: UploadJobDescriptionDeps;
  uploadJobDescription?: CorpusUploadFn;
};

export function JobMarketConsoleCorpusPage({
  corpus,
  employers,
  markdownDeps,
  uploadDeps,
  uploadJobDescription,
}: JobMarketConsoleCorpusPageProps) {
  return (
    <JobMarketCorpusWorkspace
      corpus={corpus}
      employers={employers}
      markdownDeps={markdownDeps}
      uploadDeps={uploadDeps}
      uploadJobDescription={uploadJobDescription}
    />
  );
}
