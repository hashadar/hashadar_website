'use client';

import Link from 'next/link';
import { Container, Section, SectionHeader, Text } from '@/components/ui';
import { JobMarketLabAdminSection } from '@/components/sections/labs/job-market-lab-admin-section';
import { JobMarketLabComparePanel } from '@/components/sections/labs/job-market-lab-compare-panel';
import { JobMarketLabCorpusAdmin } from '@/components/sections/labs/job-market-lab-corpus-admin';
import { JobMarketLabCvPanel } from '@/components/sections/labs/job-market-lab-cv-panel';
import { JobMarketLabEmployerAdmin } from '@/components/sections/labs/job-market-lab-employer-admin';
import { JobMarketLabHitlQueuePanel } from '@/components/sections/labs/job-market-lab-hitl-queue-panel';
import { JobMarketLabMetadataAdmin } from '@/components/sections/labs/job-market-lab-metadata-admin';
import { JobMarketLabPayPrestigeAnalyticsPanel } from '@/components/sections/labs/job-market-lab-pay-prestige-analytics-panel';
import { JobMarketLabRunsPanel } from '@/components/sections/labs/job-market-lab-runs-panel';
import { JobMarketLabThemeLabelsPanel } from '@/components/sections/labs/job-market-lab-theme-labels-panel';
import { JobMarketLabUploadPanel } from '@/components/sections/labs/job-market-lab-upload-panel';
import { jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import type { AmplifyCorpusDeps } from '@/lib/job-market-corpus-amplify';
import type { CanonicalCvDeps } from '@/lib/canonical-cv';
import type { ListAnalysisRunsDeps, StartJobMarketRecompute } from '@/lib/job-market-lab';

export type JobMarketLabConsoleSectionProps = {
  corpus?: AmplifyCorpusDeps;
  analysisRuns?: ListAnalysisRunsDeps;
  startRecompute?: StartJobMarketRecompute;
  canonicalCv?: CanonicalCvDeps;
};

export function JobMarketLabConsoleSection({
  corpus,
  analysisRuns,
  startRecompute,
  canonicalCv,
}: JobMarketLabConsoleSectionProps) {
  const { session, isLoading } = useSiteAuth();

  if (isLoading) {
    return (
      <Section className="py-20">
        <Container>
          <Text variant="muted">Checking session…</Text>
        </Container>
      </Section>
    );
  }

  if (session === null || session.status !== 'authenticated') {
    return (
      <Section className="py-20">
        <Container>
          <div className="max-w-2xl space-y-4">
            <SectionHeader animated={false}>
              {jobMarketLab.console.unauthenticatedHeading}
            </SectionHeader>
            <Text variant="muted">
              {jobMarketLab.console.unauthenticatedDescription}
            </Text>
            <Link
              href="/login"
              className="inline-flex font-body text-base text-[var(--foreground)] underline underline-offset-4"
            >
              {jobMarketLab.console.signInLabel}
            </Link>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section className="py-20">
      <Container>
        <div className="mb-12 max-w-2xl space-y-4">
          <SectionHeader animated={false}>{jobMarketLab.console.heading}</SectionHeader>
          <Text variant="muted">{jobMarketLab.console.description}</Text>
        </div>

        <JobMarketLabAdminSection startRecompute={startRecompute} />
        <JobMarketLabCvPanel canonicalCv={canonicalCv} />
        <JobMarketLabComparePanel canonicalCv={canonicalCv} corpus={corpus} />
        <JobMarketLabUploadPanel />
        <JobMarketLabHitlQueuePanel />
        <JobMarketLabEmployerAdmin />
        <JobMarketLabMetadataAdmin corpus={corpus} />
        <JobMarketLabPayPrestigeAnalyticsPanel />
        <JobMarketLabCorpusAdmin corpus={corpus} />
        <JobMarketLabThemeLabelsPanel />
        <JobMarketLabRunsPanel analysisRuns={analysisRuns} />
      </Container>
    </Section>
  );
}
