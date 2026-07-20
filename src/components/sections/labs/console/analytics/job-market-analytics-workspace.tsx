'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Heading, SectionHeader, Text } from '@/components/ui';
import { JobMarketLabAdminSection } from '@/components/sections/labs/job-market-lab-admin-section';
import { JobMarketLabPayPrestigeAnalyticsPanel } from '@/components/sections/labs/job-market-lab-pay-prestige-analytics-panel';
import { JobMarketLabPulseFiltersPanel } from '@/components/sections/labs/job-market-lab-pulse-filters-panel';
import { JobMarketLabThemeLabelsPanel } from '@/components/sections/labs/job-market-lab-theme-labels-panel';
import { jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import {
  getOwnerPayPrestigeAnalytics,
  type GetOwnerPayPrestigeAnalyticsDeps,
  type OwnerPayPrestigeAnalytics,
  type StartJobMarketRecompute,
} from '@/lib/job-market-lab';
import { createDefaultAmplifyPayPrestigeAnalyticsDeps } from '@/lib/job-market-pay-prestige-analytics-amplify';

export type JobMarketAnalyticsWorkspaceProps = {
  analytics?: GetOwnerPayPrestigeAnalyticsDeps;
  startRecompute?: StartJobMarketRecompute;
};

function rateFor(
  analytics: OwnerPayPrestigeAnalytics,
  field: OwnerPayPrestigeAnalytics['missingDataRates'][number]['field'],
) {
  return analytics.missingDataRates.find((entry) => entry.field === field);
}

function formatPercent(rate: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(rate);
}

export function JobMarketAnalyticsWorkspace({
  analytics: analyticsDepsProp,
  startRecompute,
}: JobMarketAnalyticsWorkspaceProps) {
  const copy = jobMarketLab.console.analyticsWorkspace;
  const { session, isLoading } = useSiteAuth();
  const [analytics, setAnalytics] = useState<OwnerPayPrestigeAnalytics | null>(
    null,
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isLoading || session?.status !== 'authenticated') {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const deps =
          analyticsDepsProp ?? createDefaultAmplifyPayPrestigeAnalyticsDeps();
        const next = await getOwnerPayPrestigeAnalytics(deps);
        if (!cancelled) {
          setAnalytics(next);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setAnalytics(null);
          setError(true);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [analyticsDepsProp, isLoading, session?.status]);

  if (isLoading || session === null || session.status !== 'authenticated') {
    return null;
  }

  const disclosed = analytics ? rateFor(analytics, 'compensationDisclosed') : null;
  const employer = analytics ? rateFor(analytics, 'employerLink') : null;
  const complete = analytics ? rateFor(analytics, 'completeCompensation') : null;

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <SectionHeader as="h2" size="md" animated={false} showLeftAccent>
          {copy.heading}
        </SectionHeader>
        <Text variant="muted">{copy.description}</Text>
      </div>

      <section className="space-y-4" aria-labelledby="analytics-summary-heading">
        <Heading id="analytics-summary-heading" as="h3" size="sm">
          {copy.summaryHeading}
        </Heading>
        {error ? (
          <p role="alert" className="font-body text-sm text-[var(--foreground)]">
            {jobMarketLab.payPrestigeAnalytics.errorLabel}
          </p>
        ) : null}
        {!error && analytics === null ? (
          <Text variant="muted">{jobMarketLab.payPrestigeAnalytics.loadingLabel}</Text>
        ) : null}
        {!error && analytics !== null ? (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="border-l-2 border-l-[var(--primary)] pl-3">
              <dt>
                <Text size="sm" variant="muted">
                  {copy.activeDocumentsLabel}
                </Text>
              </dt>
              <dd>
                <Text className="text-2xl font-semibold tabular-nums tracking-tight">
                  {analytics.activeDocumentCount}
                </Text>
              </dd>
            </div>
            <div className="border-l-2 border-[var(--border)] pl-3">
              <dt>
                <Text size="sm" variant="muted">
                  {copy.payDisclosedLabel}
                </Text>
              </dt>
              <dd>
                <Text className="tabular-nums">
                  {disclosed?.present ?? 0}
                  {disclosed ? (
                    <Text as="span" size="sm" variant="muted" className="ml-1">
                      ({formatPercent(1 - disclosed.missingRate)})
                    </Text>
                  ) : null}
                </Text>
              </dd>
            </div>
            <div className="border-l-2 border-[var(--border)] pl-3">
              <dt>
                <Text size="sm" variant="muted">
                  {copy.payUndisclosedLabel}
                </Text>
              </dt>
              <dd>
                <Text className="tabular-nums">{disclosed?.missing ?? 0}</Text>
              </dd>
            </div>
            <div className="border-l-2 border-[var(--border)] pl-3">
              <dt>
                <Text size="sm" variant="muted">
                  {copy.employerLinkedLabel}
                </Text>
              </dt>
              <dd>
                <Text className="tabular-nums">
                  {employer?.present ?? 0}
                  {employer ? (
                    <Text as="span" size="sm" variant="muted" className="ml-1">
                      ({formatPercent(1 - employer.missingRate)})
                    </Text>
                  ) : null}
                </Text>
              </dd>
            </div>
            <div className="border-l-2 border-[var(--border)] pl-3">
              <dt>
                <Text size="sm" variant="muted">
                  {copy.completeCompensationLabel}
                </Text>
              </dt>
              <dd>
                <Text className="tabular-nums">{complete?.present ?? 0}</Text>
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section className="space-y-4 border-t border-[var(--border)] pt-8">
        <div className="space-y-2">
          <Heading as="h3" size="sm">
            {copy.startRecomputeHeading}
          </Heading>
          <Text size="sm" variant="muted">
            {copy.startRecomputeDescription}
          </Text>
        </div>
        <JobMarketLabAdminSection
          startRecompute={startRecompute}
          variant="primary"
        />
        <Link
          href="/labs/job-market/console/runs"
          className="inline-flex font-body text-sm text-[var(--foreground)] underline underline-offset-4"
        >
          {copy.viewRunsLabel}
        </Link>
      </section>

      <JobMarketLabPayPrestigeAnalyticsPanel
        analytics={analyticsDepsProp}
        embedded
      />

      <section className="space-y-6 border-t border-[var(--border)] pt-8">
        <div className="space-y-2">
          <Heading as="h3" size="sm">
            {copy.secondaryToolsHeading}
          </Heading>
          <Text size="sm" variant="muted">
            {copy.secondaryToolsDescription}
          </Text>
        </div>
        <JobMarketLabThemeLabelsPanel embedded />
        <JobMarketLabPulseFiltersPanel embedded />
      </section>
    </div>
  );
}
