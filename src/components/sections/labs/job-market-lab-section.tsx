'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Container, Section, SectionHeader, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import type {
  JobMarketSnapshot,
  PublishedJobMarketResult,
  SkillFrequency,
  TaxonomyBucket,
} from '@/lib/job-market-lab';
import {
  filterJobMarketPulse,
  type JobMarketPulseTimeWindow,
} from '@/lib/job-market-pulse-filters';
import { useSiteAuth } from '@/hooks/use-site-auth';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

interface JobMarketLabSectionProps {
  publication: PublishedJobMarketResult;
}

function formatPublishedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function FrequencyBars({
  items,
  labelledBy,
}: {
  items: Array<SkillFrequency | TaxonomyBucket>;
  labelledBy: string;
}) {
  const max = Math.max(...items.map((item) => item.count), 1);
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <ul className="space-y-3" aria-labelledby={labelledBy}>
      {items.map((item) => (
        <li key={item.name} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3">
          <Text size="sm" className="truncate">
            {item.name}
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

function ClusterProjection({ snapshot }: { snapshot: JobMarketSnapshot }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const points = snapshot.projection.slice(0, 200);

  if (points.length === 0) {
    return null;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Cluster sizes">
        {snapshot.clusters.map((cluster) => (
          <li key={cluster.id}>
            <Text size="sm">
              {cluster.label}
              <span className="text-[var(--muted-foreground)]"> · {cluster.size}</span>
            </Text>
          </li>
        ))}
      </ul>
      <svg
        viewBox="0 0 320 180"
        role="img"
        aria-label="Two-dimensional projection of requirement clusters"
        className="h-auto w-full max-w-xl border border-[color-mix(in_oklab,var(--foreground)_14%,transparent)] bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)]"
      >
        {points.map((point, index) => {
          const cx = ((point.x - minX) / spanX) * 300 + 10;
          const cy = 170 - ((point.y - minY) / spanY) * 160;
          return (
            <circle
              key={`${point.clusterId}-${index}`}
              cx={cx}
              cy={cy}
              r={4}
              className={cn(
                point.clusterId % 2 === 0
                  ? 'fill-[var(--foreground)]'
                  : 'fill-[color-mix(in_oklab,var(--foreground)_55%,transparent)]',
                !prefersReducedMotion && 'transition-opacity duration-300',
              )}
              opacity={0.85}
            />
          );
        })}
      </svg>
    </div>
  );
}

function PublishedDashboard({ snapshot }: { snapshot: JobMarketSnapshot }) {
  const [timeWindow, setTimeWindow] = useState<JobMarketPulseTimeWindow>('all');
  const filtered = useMemo(
    () =>
      filterJobMarketPulse(
        { snapshot, corpusMeta: snapshot.corpusMeta },
        { timeWindow },
        { audience: 'public' },
      ),
    [snapshot, timeWindow],
  );

  const displaySnapshot: JobMarketSnapshot = {
    ...snapshot,
    documentCount: filtered.documentCount,
    technologies: filtered.technologies,
    skills: filtered.skills,
    seniority: filtered.seniority,
    roleFamily: filtered.roleFamily,
    clusters: filtered.clusters,
    projection: filtered.projection,
  };

  const technologiesId = 'job-market-technologies-heading';
  const taxonomyId = 'job-market-taxonomy-heading';
  const clustersId = 'job-market-clusters-heading';
  const technologyPulse = displaySnapshot.technologies ?? displaySnapshot.skills;
  const showTimeFilter = snapshot.corpusMeta != null;

  return (
    <div className="space-y-14">
      {showTimeFilter ? (
        <section className="max-w-md space-y-2" aria-labelledby="job-market-time-filter-label">
          <Text id="job-market-time-filter-label" size="sm" variant="muted">
            {jobMarketLab.pulseFiltersTimeLabel}
          </Text>
          <select
            className="w-full rounded-md border border-[color-mix(in_oklab,var(--foreground)_20%,transparent)] bg-transparent px-3 py-2 font-body text-base text-[var(--foreground)]"
            value={timeWindow}
            onChange={(event) => {
              setTimeWindow(event.target.value as JobMarketPulseTimeWindow);
            }}
          >
            {(['all', '3m', '6m', '12m', '18m'] as const).map((window) => (
              <option key={window} value={window}>
                {jobMarketLab.pulseFilterTimeOptions[window]}
              </option>
            ))}
          </select>
        </section>
      ) : null}

      <section className="space-y-4" aria-labelledby="job-market-metrics-heading">
        <SectionHeader id="job-market-metrics-heading" as="h2" size="md" animated={false} showLeftAccent={false}>
          {jobMarketLab.metricsHeading}
        </SectionHeader>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Text size="sm" variant="muted">
              {jobMarketLab.documentCountLabel}
            </Text>
            <Text className="text-3xl font-semibold tabular-nums tracking-tight">
              {displaySnapshot.documentCount}
            </Text>
          </div>
          <div className="space-y-1">
            <Text size="sm" variant="muted">
              {jobMarketLab.publishedAtLabel}
            </Text>
            <Text className="text-xl font-medium tracking-tight">
              {formatPublishedAt(displaySnapshot.publishedAt)}
            </Text>
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby={technologiesId}>
        <SectionHeader id={technologiesId} as="h2" size="md" animated={false} showLeftAccent={false}>
          {jobMarketLab.skillsHeading}
        </SectionHeader>
        <FrequencyBars items={technologyPulse.slice(0, 40)} labelledBy={technologiesId} />
      </section>

      <section className="space-y-6" aria-labelledby={taxonomyId}>
        <SectionHeader id={taxonomyId} as="h2" size="md" animated={false} showLeftAccent={false}>
          {jobMarketLab.taxonomyHeading}
        </SectionHeader>
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-3">
            <Text size="sm" variant="muted">
              {jobMarketLab.seniorityLabel}
            </Text>
            <FrequencyBars
              items={displaySnapshot.seniority}
              labelledBy={taxonomyId}
            />
          </div>
          <div className="space-y-3">
            <Text size="sm" variant="muted">
              {jobMarketLab.roleFamilyLabel}
            </Text>
            <FrequencyBars
              items={displaySnapshot.roleFamily}
              labelledBy={taxonomyId}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby={clustersId}>
        <SectionHeader id={clustersId} as="h2" size="md" animated={false} showLeftAccent={false}>
          {jobMarketLab.clustersHeading}
        </SectionHeader>
        <ClusterProjection snapshot={displaySnapshot} />
      </section>
    </div>
  );
}

export function JobMarketLabSection({ publication }: JobMarketLabSectionProps) {
  const { session, isLoading } = useSiteAuth();
  const showConsoleLink =
    !isLoading && session !== null && session.status === 'authenticated';

  return (
    <Section className="py-20">
      <Container>
        <div className="mb-12 max-w-2xl space-y-4">
          <SectionHeader animated={false}>{jobMarketLab.heading}</SectionHeader>
          <Text variant="muted">{jobMarketLab.description}</Text>
          <Text size="sm" variant="muted">
            {jobMarketLab.corpusNote}
          </Text>
          {showConsoleLink ? (
            <Link
              href="/labs/job-market/console"
              className="inline-flex font-body text-sm text-[var(--foreground)] underline underline-offset-4"
            >
              {jobMarketLab.console.openConsoleLabel}
            </Link>
          ) : null}
        </div>

        {publication.status === 'empty' ? (
          <div className="max-w-2xl space-y-2" role="status">
            <Text>{jobMarketLab.emptyState}</Text>
          </div>
        ) : (
          <PublishedDashboard snapshot={publication.snapshot} />
        )}
      </Container>
    </Section>
  );
}
