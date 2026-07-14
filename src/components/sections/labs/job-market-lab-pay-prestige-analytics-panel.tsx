'use client';

import { useEffect, useState } from 'react';
import { Heading, SectionHeader, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import {
  getOwnerPayPrestigeAnalytics,
  type GetOwnerPayPrestigeAnalyticsDeps,
  type OwnerPayPrestigeAnalytics,
  type TierBucket,
} from '@/lib/job-market-lab';
import { createDefaultAmplifyPayPrestigeAnalyticsDeps } from '@/lib/job-market-pay-prestige-analytics-amplify';
import { cn } from '@/lib/utils';

export type JobMarketLabPayPrestigeAnalyticsPanelProps = {
  analytics?: GetOwnerPayPrestigeAnalyticsDeps;
};

function formatPercent(rate: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(rate);
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-GB')}`;
  }
}

function TierBars({ items, labelledBy }: { items: TierBucket[]; labelledBy: string }) {
  const max = Math.max(...items.map((item) => item.count), 1);
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <ul className="space-y-3" aria-labelledby={labelledBy}>
      {items.map((item) => (
        <li
          key={item.tier}
          className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3"
        >
          <Text size="sm" className="truncate">
            {item.tier}
          </Text>
          <div
            className="h-2 overflow-hidden rounded-sm bg-[color-mix(in_oklab,var(--foreground)_12%,transparent)]"
            role="presentation"
          >
            <div
              className={cn(
                'h-full rounded-sm bg-[var(--foreground)]',
                !prefersReducedMotion && 'transition-[width] duration-500 ease-out',
              )}
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
          <Text size="sm" variant="muted" className="tabular-nums">
            {item.count}
          </Text>
        </li>
      ))}
    </ul>
  );
}

function AnalyticsDashboard({ analytics }: { analytics: OwnerPayPrestigeAnalytics }) {
  const copy = jobMarketLab.payPrestigeAnalytics;
  const missingDataId = 'job-market-missing-data-heading';
  const prestigeId = 'job-market-prestige-heading';
  const sizeId = 'job-market-size-heading';
  const compensationId = 'job-market-compensation-heading';

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <Text size="sm" variant="muted">
          {copy.activeDocumentsLabel}
        </Text>
        <Text className="text-3xl font-semibold tabular-nums tracking-tight">
          {analytics.activeDocumentCount}
        </Text>
      </div>

      <section className="space-y-4" aria-labelledby={missingDataId}>
        <Heading id={missingDataId} as="h3" size="sm">
          {copy.missingDataHeading}
        </Heading>
        <ul className="space-y-3">
          {analytics.missingDataRates.map((rate) => (
            <li
              key={rate.field}
              className="grid gap-2 border border-[color-mix(in_oklab,var(--foreground)_12%,transparent)] p-4 sm:grid-cols-[minmax(0,12rem)_1fr]"
            >
              <Text size="sm">{copy.missingFieldLabels[rate.field]}</Text>
              <div className="space-y-1">
                <Text size="sm" variant="muted">
                  {copy.presentLabel}: {rate.present} · {copy.missingLabel}: {rate.missing} (
                  {formatPercent(rate.missingRate)} {copy.missingLabel.toLowerCase()})
                </Text>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4" aria-labelledby={prestigeId}>
        <Heading id={prestigeId} as="h3" size="sm">
          {copy.prestigeHeading}
        </Heading>
        <TierBars items={analytics.prestigeTierBreakdown} labelledBy={prestigeId} />
      </section>

      <section className="space-y-4" aria-labelledby={sizeId}>
        <Heading id={sizeId} as="h3" size="sm">
          {copy.sizeHeading}
        </Heading>
        <TierBars items={analytics.sizeTierBreakdown} labelledBy={sizeId} />
      </section>

      <section className="space-y-4" aria-labelledby={compensationId}>
        <Heading id={compensationId} as="h3" size="sm">
          {copy.compensationHeading}
        </Heading>
        {analytics.compensationByCurrency.length === 0 ? (
          <Text variant="muted">{copy.compensationEmpty}</Text>
        ) : (
          <ul className="space-y-4">
            {analytics.compensationByCurrency.map((summary) => (
              <li
                key={summary.currency}
                className="space-y-2 border border-[color-mix(in_oklab,var(--foreground)_12%,transparent)] p-4"
              >
                <Text className="font-medium">{summary.currency}</Text>
                <Text size="sm" variant="muted">
                  {copy.documentCountLabel}: {summary.count}
                </Text>
                {summary.medianMin != null ? (
                  <Text size="sm">
                    {copy.medianMinLabel}: {formatCurrency(summary.medianMin, summary.currency)}
                  </Text>
                ) : null}
                {summary.medianMax != null ? (
                  <Text size="sm">
                    {copy.medianMaxLabel}: {formatCurrency(summary.medianMax, summary.currency)}
                  </Text>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function JobMarketLabPayPrestigeAnalyticsPanel({
  analytics: analyticsDepsProp,
}: JobMarketLabPayPrestigeAnalyticsPanelProps) {
  const { session, isLoading } = useSiteAuth();
  const [analytics, setAnalytics] = useState<OwnerPayPrestigeAnalytics | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isLoading || session?.status !== 'authenticated') {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const deps = analyticsDepsProp ?? createDefaultAmplifyPayPrestigeAnalyticsDeps();
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

  const copy = jobMarketLab.payPrestigeAnalytics;

  return (
    <div className="mt-16 max-w-2xl space-y-6 border-t border-[var(--border)] pt-12">
      <div className="space-y-3">
        <SectionHeader as="h2" size="md" animated={false} showLeftAccent={false}>
          {copy.heading}
        </SectionHeader>
        <Text variant="muted">{copy.description}</Text>
      </div>

      {error ? (
        <p role="alert" className="font-body text-base text-[var(--foreground)]">
          {copy.errorLabel}
        </p>
      ) : null}

      {!error && analytics === null ? (
        <Text variant="muted">{copy.loadingLabel}</Text>
      ) : null}

      {!error && analytics !== null ? <AnalyticsDashboard analytics={analytics} /> : null}
    </div>
  );
}
