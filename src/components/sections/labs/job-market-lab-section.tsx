'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Container, MotionReveal, SectionHeader, Text } from '@/components/ui';
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

const CLUSTER_FILLS = [
  'var(--primary)',
  'var(--foreground)',
  'color-mix(in oklab, var(--primary) 55%, var(--foreground))',
  'color-mix(in oklab, var(--foreground) 45%, transparent)',
  'color-mix(in oklab, var(--primary) 35%, var(--foreground))',
  'color-mix(in oklab, var(--foreground) 70%, transparent)',
] as const;

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
  dense = false,
}: {
  items: Array<SkillFrequency | TaxonomyBucket>;
  labelledBy: string;
  dense?: boolean;
}) {
  const max = Math.max(...items.map((item) => item.count), 1);
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <ul className={cn(dense ? 'space-y-2' : 'space-y-2.5')} aria-labelledby={labelledBy}>
      {items.map((item) => (
        <li
          key={item.name}
          className={cn(
            'grid items-center gap-2',
            dense
              ? 'grid-cols-[minmax(0,5.5rem)_1fr_auto]'
              : 'grid-cols-[minmax(0,7rem)_1fr_auto] gap-3',
          )}
        >
          <Text size="sm" className="truncate">
            {item.name}
          </Text>
          <div
            className="h-1.5 overflow-hidden rounded-sm bg-[color-mix(in_oklab,var(--foreground)_10%,transparent)]"
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

function ThemeSizeBars({
  clusters,
  labelledBy,
}: {
  clusters: JobMarketSnapshot['clusters'];
  labelledBy: string;
}) {
  const ranked = [...clusters]
    .filter((cluster) => cluster.size > 0)
    .sort((a, b) => b.size - a.size || a.label.localeCompare(b.label));
  const max = Math.max(...ranked.map((cluster) => cluster.size), 1);
  const prefersReducedMotion = usePrefersReducedMotion();

  if (ranked.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2.5" aria-labelledby={labelledBy}>
      {ranked.map((cluster) => (
        <li
          key={cluster.id}
          className="grid grid-cols-[minmax(0,1fr)_minmax(4rem,8rem)_auto] items-center gap-3"
        >
          <Text size="sm" className="truncate">
            <span
              className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
              style={{ background: CLUSTER_FILLS[cluster.id % CLUSTER_FILLS.length] }}
              aria-hidden
            />
            {cluster.label}
          </Text>
          <div
            className="h-1.5 overflow-hidden rounded-sm bg-[color-mix(in_oklab,var(--foreground)_10%,transparent)]"
            role="presentation"
          >
            <div
              className={cn(
                'h-full rounded-sm',
                !prefersReducedMotion && 'transition-[width] duration-500 ease-out',
              )}
              style={{
                width: `${(cluster.size / max) * 100}%`,
                background: CLUSTER_FILLS[cluster.id % CLUSTER_FILLS.length],
              }}
            />
          </div>
          <Text size="sm" variant="muted" className="tabular-nums">
            {cluster.size}
          </Text>
        </li>
      ))}
    </ul>
  );
}

function ThemeMap({ snapshot }: { snapshot: JobMarketSnapshot }) {
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
    <svg
      viewBox="0 0 420 240"
      role="img"
      aria-label={jobMarketLab.clustersMapHeading}
      className="h-auto w-full border border-[color-mix(in_oklab,var(--foreground)_12%,transparent)] bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)]"
    >
      {points.map((point, index) => {
        const cx = ((point.x - minX) / spanX) * 396 + 12;
        const cy = 228 - ((point.y - minY) / spanY) * 216;
        return (
          <circle
            key={`${point.clusterId}-${index}`}
            cx={cx}
            cy={cy}
            r={4.5}
            fill={CLUSTER_FILLS[point.clusterId % CLUSTER_FILLS.length]}
            className={cn(!prefersReducedMotion && 'transition-opacity duration-300')}
            opacity={0.88}
          />
        );
      })}
    </svg>
  );
}

function CraftMethodologySection() {
  const craft = jobMarketLab.craft;
  const headingId = 'job-market-craft-heading';

  return (
    <section
      className="relative mt-14 overflow-hidden border-t border-[color-mix(in_oklab,var(--foreground)_12%,transparent)] pt-10 md:mt-16 md:pt-12"
      aria-labelledby={headingId}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,color-mix(in_oklab,var(--primary)_7%,transparent),transparent_50%)]"
      />
      <div className="relative space-y-8">
        <MotionReveal variant="fade-up" distance="sm" className="max-w-3xl space-y-3">
          <SectionHeader
            id={headingId}
            as="h2"
            size="md"
            animated={false}
            showLeftAccent
          >
            {craft.heading}
          </SectionHeader>
          <Text className="text-[var(--foreground)]">{craft.intro}</Text>
        </MotionReveal>

        <ol className="grid gap-x-8 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
          {craft.stages.map((stage, index) => (
            <li
              key={stage.id}
              className="relative space-y-3 border-l-2 border-[color-mix(in_oklab,var(--primary)_45%,transparent)] pl-4"
            >
              <MotionReveal
                variant="fade-up"
                distance="sm"
                delay={Math.min(index * 0.04, 0.24)}
                className="space-y-3"
              >
                <div className="flex items-baseline gap-3">
                  <span
                    className="font-body text-xs font-semibold tabular-nums tracking-wide text-[var(--primary)]"
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-body text-base font-semibold tracking-tight text-[var(--foreground)]">
                    {stage.title}
                  </h3>
                </div>
                <div className="space-y-1.5">
                  <p className="font-body text-[0.65rem] font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                    {craft.inShortLabel}
                  </p>
                  <Text size="sm">{stage.inShort}</Text>
                </div>
                <div className="space-y-1.5">
                  <p className="font-body text-[0.65rem] font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                    {craft.underTheHoodLabel}
                  </p>
                  <Text size="sm" variant="muted">
                    {stage.underTheHood}
                  </Text>
                </div>
              </MotionReveal>
            </li>
          ))}
        </ol>

        {craft.closing ? (
          <MotionReveal variant="fade-up" distance="sm" delay={0.12} className="max-w-3xl">
            <Text size="sm" variant="muted">
              {craft.closing}
            </Text>
          </MotionReveal>
        ) : null}
      </div>
    </section>
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
  const themeSizeId = 'job-market-theme-size-heading';
  const themeMapId = 'job-market-theme-map-heading';
  const technologyPulse = displaySnapshot.technologies ?? displaySnapshot.skills;
  const topSignals = technologyPulse.slice(0, 3).map((item) => item.name);
  const showTimeFilter = snapshot.corpusMeta != null;

  return (
    <div className="space-y-8 md:space-y-10">
      <div className="flex flex-col gap-4 border-b border-[color-mix(in_oklab,var(--foreground)_12%,transparent)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Text size="sm" className="font-medium tracking-wide text-[var(--muted-foreground)]">
            {jobMarketLab.metricsHeading}
          </Text>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <Text size="sm" variant="muted">
                {jobMarketLab.documentCountLabel}
              </Text>
              <p className="font-body text-3xl font-semibold tabular-nums tracking-tight text-[var(--foreground)]">
                {displaySnapshot.documentCount}
              </p>
            </div>
            <div>
              <Text size="sm" variant="muted">
                {jobMarketLab.publishedAtLabel}
              </Text>
              <p className="font-body text-lg font-medium tracking-tight text-[var(--foreground)]">
                {formatPublishedAt(displaySnapshot.publishedAt)}
              </p>
            </div>
            {topSignals.length > 0 ? (
              <div className="min-w-0">
                <Text size="sm" variant="muted">
                  {jobMarketLab.topSignalsLabel}
                </Text>
                <p className="font-body text-sm text-[var(--foreground)]">
                  {topSignals.join(' · ')}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {showTimeFilter ? (
          <div className="w-full max-w-xs space-y-1.5 lg:shrink-0">
            <label
              htmlFor="job-market-time-filter"
              className="font-body text-sm text-[var(--muted-foreground)]"
            >
              {jobMarketLab.pulseFiltersTimeLabel}
            </label>
            <select
              id="job-market-time-filter"
              className="w-full rounded-md border border-[color-mix(in_oklab,var(--foreground)_20%,transparent)] bg-transparent px-3 py-2 font-body text-sm text-[var(--foreground)]"
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
          </div>
        ) : null}
      </div>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <section className="space-y-3" aria-labelledby={technologiesId}>
          <SectionHeader
            id={technologiesId}
            as="h2"
            size="md"
            animated={false}
            showLeftAccent={false}
          >
            {jobMarketLab.skillsHeading}
          </SectionHeader>
          <Text size="sm" variant="muted">
            {jobMarketLab.skillsCaption}
          </Text>
          <FrequencyBars items={technologyPulse.slice(0, 40)} labelledBy={technologiesId} />
        </section>

        <section className="space-y-4" aria-labelledby={clustersId}>
          <SectionHeader
            id={clustersId}
            as="h2"
            size="md"
            animated={false}
            showLeftAccent={false}
          >
            {jobMarketLab.clustersHeading}
          </SectionHeader>
          <Text size="sm" variant="muted">
            {jobMarketLab.clustersCaption}
          </Text>

          <div className="space-y-3">
            <Text id={themeSizeId} size="sm" className="font-medium">
              {jobMarketLab.clustersSizeHeading}
            </Text>
            <ThemeSizeBars clusters={displaySnapshot.clusters} labelledBy={themeSizeId} />
          </div>

          <div className="space-y-3">
            <Text id={themeMapId} size="sm" className="font-medium">
              {jobMarketLab.clustersMapHeading}
            </Text>
            <ThemeMap snapshot={displaySnapshot} />
          </div>
        </section>
      </div>

      <section
        className="space-y-3 border-t border-[color-mix(in_oklab,var(--foreground)_10%,transparent)] pt-6"
        aria-labelledby={taxonomyId}
      >
        <SectionHeader
          id={taxonomyId}
          as="h2"
          size="sm"
          animated={false}
          showLeftAccent={false}
          className="text-[var(--muted-foreground)]"
        >
          {jobMarketLab.taxonomyHeading}
        </SectionHeader>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Text size="sm" variant="muted">
              {jobMarketLab.seniorityLabel}
            </Text>
            <FrequencyBars
              items={displaySnapshot.seniority}
              labelledBy={taxonomyId}
              dense
            />
          </div>
          <div className="space-y-2">
            <Text size="sm" variant="muted">
              {jobMarketLab.roleFamilyLabel}
            </Text>
            <FrequencyBars
              items={displaySnapshot.roleFamily}
              labelledBy={taxonomyId}
              dense
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export function JobMarketLabSection({ publication }: JobMarketLabSectionProps) {
  const { session, isLoading } = useSiteAuth();
  const showConsoleLink =
    !isLoading && session !== null && session.status === 'authenticated';
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="relative min-h-[calc(100vh-5rem)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_55%),linear-gradient(180deg,color-mix(in_oklab,var(--foreground)_3%,transparent),transparent_40%)]"
      />
      <Container size="xl" className="relative py-8 md:py-10">
        <header className="mb-8 flex flex-col gap-3 md:mb-10 md:gap-4">
          <p className="font-body text-xs font-medium uppercase tracking-[0.14em] text-[var(--primary)]">
            {jobMarketLab.brandEyebrow}
          </p>
          {/* Extra bottom padding clears xl heading descenders (tight line-height 0.8). */}
          <SectionHeader
            animated={!prefersReducedMotion}
            size="xl"
            showLeftAccent
            className="max-w-3xl pb-[0.28em]"
          >
            {jobMarketLab.heading}
          </SectionHeader>
          <Text className="max-w-2xl text-[var(--foreground)]">{jobMarketLab.purposeLine}</Text>
          {jobMarketLab.corpusNote ? (
            <Text size="sm" variant="muted" className="max-w-2xl">
              {jobMarketLab.corpusNote}
            </Text>
          ) : null}
          {showConsoleLink ? (
            <Link
              href="/labs/job-market/console"
              className="inline-flex font-body text-sm text-[var(--foreground)] underline underline-offset-4"
            >
              {jobMarketLab.console.openConsoleLabel}
            </Link>
          ) : null}
        </header>

        {publication.status === 'empty' ? (
          <div className="space-y-4 py-8" role="status">
            <Text className="max-w-xl">{jobMarketLab.emptyState}</Text>
            <CraftMethodologySection />
          </div>
        ) : (
          <>
            <PublishedDashboard snapshot={publication.snapshot} />
            <CraftMethodologySection />
          </>
        )}
      </Container>
    </div>
  );
}
