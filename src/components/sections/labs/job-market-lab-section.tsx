'use client';

import { Container, Section, SectionHeader, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import type {
  JobMarketSnapshot,
  PublishedJobMarketResult,
  SkillFrequency,
  TaxonomyBucket,
} from '@/lib/job-market-lab';
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
  const skillsId = 'job-market-skills-heading';
  const taxonomyId = 'job-market-taxonomy-heading';
  const clustersId = 'job-market-clusters-heading';

  return (
    <div className="space-y-14">
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
              {snapshot.documentCount}
            </Text>
          </div>
          <div className="space-y-1">
            <Text size="sm" variant="muted">
              {jobMarketLab.publishedAtLabel}
            </Text>
            <Text className="text-xl font-medium tracking-tight">
              {formatPublishedAt(snapshot.publishedAt)}
            </Text>
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby={skillsId}>
        <SectionHeader id={skillsId} as="h2" size="md" animated={false} showLeftAccent={false}>
          {jobMarketLab.skillsHeading}
        </SectionHeader>
        <FrequencyBars items={snapshot.skills.slice(0, 40)} labelledBy={skillsId} />
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
              items={snapshot.seniority}
              labelledBy={taxonomyId}
            />
          </div>
          <div className="space-y-3">
            <Text size="sm" variant="muted">
              {jobMarketLab.roleFamilyLabel}
            </Text>
            <FrequencyBars
              items={snapshot.roleFamily}
              labelledBy={taxonomyId}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby={clustersId}>
        <SectionHeader id={clustersId} as="h2" size="md" animated={false} showLeftAccent={false}>
          {jobMarketLab.clustersHeading}
        </SectionHeader>
        <ClusterProjection snapshot={snapshot} />
      </section>
    </div>
  );
}

export function JobMarketLabSection({ publication }: JobMarketLabSectionProps) {
  return (
    <Section className="py-20">
      <Container>
        <div className="mb-12 max-w-2xl space-y-4">
          <SectionHeader animated={false}>{jobMarketLab.heading}</SectionHeader>
          <Text variant="muted">{jobMarketLab.description}</Text>
          <Text size="sm" variant="muted">
            {jobMarketLab.corpusNote}
          </Text>
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
