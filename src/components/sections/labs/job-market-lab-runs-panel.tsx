'use client';

import { useEffect, useState } from 'react';
import { Heading, SectionHeader, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import {
  listAnalysisRuns,
  type AnalysisRunRecord,
  type AnalysisRunStatus,
  type ListAnalysisRunsDeps,
} from '@/lib/job-market-lab';
import { createDefaultAmplifyAnalysisRunDeps } from '@/lib/job-market-analysis-runs-amplify';

export type JobMarketLabRunsPanelProps = {
  analysisRuns?: ListAnalysisRunsDeps;
};

function statusLabel(status: AnalysisRunStatus): string {
  const copy = jobMarketLab.console;
  switch (status) {
    case 'queued':
      return copy.runStatusQueued;
    case 'running':
      return copy.runStatusRunning;
    case 'succeeded':
      return copy.runStatusSucceeded;
    case 'failed':
      return copy.runStatusFailed;
  }
}

export function JobMarketLabRunsPanel({ analysisRuns }: JobMarketLabRunsPanelProps) {
  const [runs, setRuns] = useState<AnalysisRunRecord[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const deps = analysisRuns ?? (await createDefaultAmplifyAnalysisRunDeps());
        const next = await listAnalysisRuns(deps);
        if (!cancelled) {
          setRuns(next);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setRuns(null);
          setError(true);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [analysisRuns]);

  return (
    <div className="mt-16 max-w-2xl space-y-6 border-t border-[var(--border)] pt-12">
      <div className="space-y-3">
        <SectionHeader as="h2" size="md" animated={false} showLeftAccent={false}>
          {jobMarketLab.console.runsHeading}
        </SectionHeader>
        <Text variant="muted">{jobMarketLab.console.runsDescription}</Text>
      </div>

      {error ? (
        <p role="alert" className="font-body text-base text-[var(--foreground)]">
          {jobMarketLab.console.runsError}
        </p>
      ) : null}

      {!error && runs === null ? (
        <Text variant="muted">{jobMarketLab.console.runsLoading}</Text>
      ) : null}

      {!error && runs !== null && runs.length === 0 ? (
        <Text variant="muted">{jobMarketLab.console.runsEmpty}</Text>
      ) : null}

      {!error && runs !== null && runs.length > 0 ? (
        <ul className="space-y-4">
          {runs.map((run) => (
            <li key={run.id} className="space-y-1 border-b border-[var(--border)] pb-4 last:border-b-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Heading as="h3" size="sm">
                  {run.id}
                </Heading>
                <Text size="sm">{statusLabel(run.status)}</Text>
              </div>
              {run.status === 'failed' && run.errorMessage ? (
                <Text size="sm" variant="muted">
                  {jobMarketLab.console.failureReasonLabel}: {run.errorMessage}
                </Text>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
