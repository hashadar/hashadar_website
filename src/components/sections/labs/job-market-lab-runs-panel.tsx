'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Heading, SectionHeader, Text } from '@/components/ui';
import { JobMarketLabAdminSection } from '@/components/sections/labs/job-market-lab-admin-section';
import { jobMarketLab } from '@/data';
import {
  listAnalysisRuns,
  type AnalysisRunRecord,
  type AnalysisRunStatus,
  type ListAnalysisRunsDeps,
  type StartJobMarketRecompute,
} from '@/lib/job-market-lab';
import { createDefaultAmplifyAnalysisRunDeps } from '@/lib/job-market-analysis-runs-amplify';
import { cn } from '@/lib/utils';

export type JobMarketLabRunsPanelProps = {
  analysisRuns?: ListAnalysisRunsDeps;
  startRecompute?: StartJobMarketRecompute;
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

function formatCost(value: number | undefined): string {
  if (value == null) {
    return '—';
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 4,
  }).format(value);
}

export function JobMarketLabRunsPanel({
  analysisRuns,
  startRecompute,
}: JobMarketLabRunsPanelProps) {
  const [runs, setRuns] = useState<AnalysisRunRecord[] | null>(null);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    const deps = analysisRuns ?? (await createDefaultAmplifyAnalysisRunDeps());
    return listAnalysisRuns(deps);
  }, [analysisRuns]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const next = await load();
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
    })();

    return () => {
      cancelled = true;
    };
  }, [load, reloadToken]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SectionHeader as="h2" size="md" animated={false} showLeftAccent>
          {jobMarketLab.console.runsHeading}
        </SectionHeader>
        <Text variant="muted">{jobMarketLab.console.runsDescription}</Text>
      </div>

      <JobMarketLabAdminSection
        startRecompute={startRecompute}
        variant="secondary"
      />

      <div className="flex items-center justify-between gap-3">
        <Text size="sm" variant="muted">
          {runs != null ? `${runs.length} runs` : ''}
        </Text>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setReloadToken((value) => value + 1)}
        >
          {jobMarketLab.console.runsReloadLabel}
        </Button>
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
        <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {runs.map((run) => {
            const accentPrimary =
              run.status === 'running' || run.status === 'succeeded';
            return (
              <li
                key={run.id}
                className={cn(
                  'grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start',
                  'border-l-4 pl-3',
                  accentPrimary
                    ? 'border-l-[var(--primary)]'
                    : 'border-l-[var(--mono-300)]',
                )}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Heading as="h3" size="sm" className="truncate">
                      {run.id}
                    </Heading>
                    <span
                      className={cn(
                        'inline-flex rounded px-1.5 py-0.5 font-body text-xs font-medium',
                        accentPrimary
                          ? 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]'
                          : 'bg-[var(--muted)] text-[var(--mono-500)]',
                      )}
                    >
                      {statusLabel(run.status)}
                    </span>
                  </div>
                  <dl className="grid gap-1 text-sm sm:grid-cols-2">
                    <div className="flex gap-2">
                      <dt className="text-[var(--mono-500)]">
                        {jobMarketLab.console.runsDocsConsideredLabel}
                      </dt>
                      <dd className="tabular-nums">
                        {run.docsConsidered ?? '—'}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-[var(--mono-500)]">
                        {jobMarketLab.console.runsEstimatedCostLabel}
                      </dt>
                      <dd className="tabular-nums">
                        {formatCost(run.estimatedCostUsd)}
                      </dd>
                    </div>
                  </dl>
                  {run.status === 'failed' && run.errorMessage ? (
                    <Text size="sm" variant="muted">
                      {jobMarketLab.console.failureReasonLabel}: {run.errorMessage}
                    </Text>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
