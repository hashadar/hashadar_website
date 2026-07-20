'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heading, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import { createDefaultAmplifyAnalysisRunDeps } from '@/lib/job-market-analysis-runs-amplify';
import {
  listAnalysisRuns,
  listPendingScrapeCandidates,
  type AnalysisRunRecord,
  type ListAnalysisRunsDeps,
} from '@/lib/job-market-lab';
import { createDefaultAmplifyScrapeCandidateDeps } from '@/lib/scrape-candidates-amplify';
import type { ListScrapeCandidatesDeps } from '@/lib/scrape-candidates';
import { cn } from '@/lib/utils';

export type JobMarketConsoleOverviewProps = {
  analysisRuns?: ListAnalysisRunsDeps;
  scrapeCandidates?: ListScrapeCandidatesDeps;
};

type StatusState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      lastRun: AnalysisRunRecord | null;
      pendingHitlCount: number;
    };

function runStatusLabel(status: AnalysisRunRecord['status']): string {
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

export function JobMarketConsoleOverview({
  analysisRuns,
  scrapeCandidates,
}: JobMarketConsoleOverviewProps) {
  const copy = jobMarketLab.console.overview;
  const navItems = jobMarketLab.console.nav.items.filter(
    (item) => item.id !== 'overview',
  );
  const [state, setState] = useState<StatusState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const runsDeps =
          analysisRuns ?? (await createDefaultAmplifyAnalysisRunDeps());
        const hitlDeps =
          scrapeCandidates ??
          (await createDefaultAmplifyScrapeCandidateDeps());

        const [runs, pending] = await Promise.all([
          listAnalysisRuns(runsDeps),
          listPendingScrapeCandidates(hitlDeps),
        ]);

        if (!cancelled) {
          setState({
            status: 'ready',
            lastRun: runs[0] ?? null,
            pendingHitlCount: pending.length,
          });
        }
      } catch {
        if (!cancelled) {
          setState({ status: 'error' });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [analysisRuns, scrapeCandidates]);

  return (
    <div className="space-y-10">
      <div className="max-w-2xl space-y-3">
        <Heading as="h2" size="md" className="text-[var(--foreground)]">
          {copy.heading}
        </Heading>
        <Text variant="muted">{copy.description}</Text>
      </div>

      <section aria-labelledby="console-status-heading" className="space-y-4">
        <Heading as="h3" size="sm" id="console-status-heading">
          {copy.statusHeading}
        </Heading>

        {state.status === 'loading' ? (
          <Text variant="muted">{copy.loadingLabel}</Text>
        ) : null}

        {state.status === 'error' ? (
          <p role="alert" className="font-body text-base text-[var(--foreground)]">
            {copy.errorLabel}
          </p>
        ) : null}

        {state.status === 'ready' ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 rounded-md border border-[var(--border)] border-l-4 border-l-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_4%,var(--background))] p-4">
              <dt className="font-body text-sm text-[var(--mono-500)]">
                {copy.lastRunLabel}
              </dt>
              <dd className="font-body text-base text-[var(--foreground)]">
                {state.lastRun
                  ? `${runStatusLabel(state.lastRun.status)} · ${state.lastRun.id}`
                  : copy.lastRunEmpty}
              </dd>
            </div>
            <div
              className={cn(
                'space-y-1 rounded-md border border-[var(--border)] border-l-4 p-4',
                state.pendingHitlCount > 0
                  ? 'border-l-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_4%,var(--background))]'
                  : 'border-l-[var(--mono-300)] bg-[var(--muted)]/40',
              )}
            >
              <dt className="font-body text-sm text-[var(--mono-500)]">
                {copy.pendingHitlLabel}
              </dt>
              <dd className="font-body text-base text-[var(--foreground)]">
                {state.pendingHitlCount > 0
                  ? copy.pendingHitlCount.replace(
                      '{count}',
                      String(state.pendingHitlCount),
                    )
                  : copy.pendingHitlEmpty}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section aria-labelledby="console-areas-heading" className="space-y-4">
        <Heading as="h3" size="sm" id="console-areas-heading">
          {copy.areasHeading}
        </Heading>
        <ul className="grid gap-3 sm:grid-cols-2">
          {navItems.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="block h-full rounded-md border border-[var(--border)] p-4 transition-colors hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] hover:bg-[color-mix(in_oklab,var(--primary)_5%,transparent)]"
              >
                <span className="font-body text-base font-medium text-[var(--primary)]">
                  {copy.openAreaLabel.replace('{label}', item.label)}
                </span>
                <span className="mt-1 block font-body text-sm text-[var(--mono-500)]">
                  {item.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
