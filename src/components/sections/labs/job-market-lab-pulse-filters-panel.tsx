'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SectionHeader, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import {
  EMPLOYER_PRESTIGE_TIERS,
  EMPLOYER_SIZE_TIERS,
  JOB_DESCRIPTION_ROLE_FAMILIES,
  JOB_DESCRIPTION_SENIORITIES,
  filterJobMarketPulse,
  fetchOwnerJobMarketPulseSource,
  type FetchOwnerJobMarketPulseSourceDeps,
  type FilteredJobMarketPulse,
  type JobMarketPulseFilterSelection,
  type JobMarketPulseTimeWindow,
  type OwnerJobMarketPulseSource,
} from '@/lib/job-market-lab';

export type JobMarketLabPulseFiltersPanelProps = {
  ownerPulse?: FetchOwnerJobMarketPulseSourceDeps;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready' }
  | { status: 'error' };

const TIME_WINDOWS: JobMarketPulseTimeWindow[] = ['all', '3m', '6m', '12m', '18m'];

const fieldClassName =
  'w-full rounded-md border border-[color-mix(in_oklab,var(--foreground)_20%,transparent)] bg-transparent px-3 py-2 font-body text-base text-[var(--foreground)]';

function FrequencySummary({ pulse }: { pulse: FilteredJobMarketPulse }) {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <Text size="sm" variant="muted">
          {jobMarketLab.console.pulseFiltersTechnologiesLabel}
        </Text>
        <ul className="space-y-2">
          {pulse.technologies.slice(0, 8).map((item) => (
            <li key={item.name} className="flex justify-between gap-4">
              <Text size="sm">{item.name}</Text>
              <Text size="sm" variant="muted" className="tabular-nums">
                {item.count}
              </Text>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-3">
        <Text size="sm" variant="muted">
          {jobMarketLab.console.pulseFiltersThemesLabel}
        </Text>
        <ul className="space-y-2">
          {pulse.clusters
            .filter((cluster) => cluster.size > 0)
            .map((cluster) => (
              <li key={cluster.id} className="flex justify-between gap-4">
                <Text size="sm">{cluster.label}</Text>
                <Text size="sm" variant="muted" className="tabular-nums">
                  {cluster.size}
                </Text>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

export function JobMarketLabPulseFiltersPanel({
  ownerPulse,
}: JobMarketLabPulseFiltersPanelProps) {
  const { session, isLoading } = useSiteAuth();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const [pulseSource, setPulseSource] = useState<OwnerJobMarketPulseSource | null>(null);
  const [selection, setSelection] = useState<JobMarketPulseFilterSelection>({
    timeWindow: 'all',
    seniority: 'all',
    roleFamily: 'all',
    employerSizeTier: 'all',
    employerPrestigeTier: 'all',
  });

  const loadSource = useCallback(async () => {
    return fetchOwnerJobMarketPulseSource(ownerPulse);
  }, [ownerPulse]);

  useEffect(() => {
    if (isLoading || session?.status !== 'authenticated') {
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoadState({ status: 'loading' });
      try {
        const source = await loadSource();
        if (cancelled) {
          return;
        }
        if (!source) {
          setLoadState({ status: 'empty' });
          setPulseSource(null);
          return;
        }
        setPulseSource(source);
        setLoadState({ status: 'ready' });
      } catch {
        if (!cancelled) {
          setLoadState({ status: 'error' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, session, loadSource]);

  const filteredPulse = useMemo(() => {
    if (!pulseSource) {
      return null;
    }
    return filterJobMarketPulse(pulseSource, selection, { audience: 'owner' });
  }, [pulseSource, selection]);

  if (isLoading || session?.status !== 'authenticated') {
    return null;
  }

  return (
    <section className="mt-16 space-y-6" aria-labelledby="job-market-pulse-filters-heading">
      <div className="space-y-2">
        <SectionHeader
          id="job-market-pulse-filters-heading"
          as="h2"
          size="md"
          animated={false}
          showLeftAccent
        >
          {jobMarketLab.console.pulseFiltersHeading}
        </SectionHeader>
        <Text variant="muted">{jobMarketLab.console.pulseFiltersDescription}</Text>
      </div>

      {loadState.status === 'loading' || loadState.status === 'idle' ? (
        <Text variant="muted">{jobMarketLab.console.pulseFiltersLoading}</Text>
      ) : null}

      {loadState.status === 'error' ? (
        <p role="alert" className="font-body text-lg leading-relaxed text-[var(--foreground)]">
          {jobMarketLab.console.pulseFiltersError}
        </p>
      ) : null}

      {loadState.status === 'empty' ? (
        <Text>{jobMarketLab.console.pulseFiltersEmpty}</Text>
      ) : null}

      {loadState.status === 'ready' && filteredPulse ? (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block space-y-2">
              <Text size="sm" variant="muted">
                {jobMarketLab.console.pulseFiltersTimeLabel}
              </Text>
              <select
                className={fieldClassName}
                value={selection.timeWindow ?? 'all'}
                onChange={(event) => {
                  setSelection((current) => ({
                    ...current,
                    timeWindow: event.target.value as JobMarketPulseTimeWindow,
                  }));
                }}
              >
                {TIME_WINDOWS.map((window) => (
                  <option key={window} value={window}>
                    {jobMarketLab.console.pulseFilterTimeOptions[window]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <Text size="sm" variant="muted">
                {jobMarketLab.seniorityLabel}
              </Text>
              <select
                className={fieldClassName}
                value={selection.seniority ?? 'all'}
                onChange={(event) => {
                  setSelection((current) => ({
                    ...current,
                    seniority: event.target.value as JobMarketPulseFilterSelection['seniority'],
                  }));
                }}
              >
                <option value="all">{jobMarketLab.console.pulseFiltersAllOption}</option>
                {JOB_DESCRIPTION_SENIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <Text size="sm" variant="muted">
                {jobMarketLab.roleFamilyLabel}
              </Text>
              <select
                className={fieldClassName}
                value={selection.roleFamily ?? 'all'}
                onChange={(event) => {
                  setSelection((current) => ({
                    ...current,
                    roleFamily: event.target.value as JobMarketPulseFilterSelection['roleFamily'],
                  }));
                }}
              >
                <option value="all">{jobMarketLab.console.pulseFiltersAllOption}</option>
                {JOB_DESCRIPTION_ROLE_FAMILIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <Text size="sm" variant="muted">
                {jobMarketLab.employerAdmin.sizeTierLabel}
              </Text>
              <select
                className={fieldClassName}
                value={selection.employerSizeTier ?? 'all'}
                onChange={(event) => {
                  setSelection((current) => ({
                    ...current,
                    employerSizeTier:
                      event.target.value as JobMarketPulseFilterSelection['employerSizeTier'],
                  }));
                }}
              >
                <option value="all">{jobMarketLab.console.pulseFiltersAllOption}</option>
                {EMPLOYER_SIZE_TIERS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <Text size="sm" variant="muted">
                {jobMarketLab.employerAdmin.prestigeTierLabel}
              </Text>
              <select
                aria-label={jobMarketLab.employerAdmin.prestigeTierLabel}
                className={fieldClassName}
                value={selection.employerPrestigeTier ?? 'all'}
                onChange={(event) => {
                  setSelection((current) => ({
                    ...current,
                    employerPrestigeTier:
                      event.target.value as JobMarketPulseFilterSelection['employerPrestigeTier'],
                  }));
                }}
              >
                <option value="all">{jobMarketLab.console.pulseFiltersAllOption}</option>
                {EMPLOYER_PRESTIGE_TIERS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Text size="sm" variant="muted">
            {jobMarketLab.console.pulseFiltersDocumentCountLabel.replace(
              '{count}',
              String(filteredPulse.documentCount),
            )}
          </Text>

          <FrequencySummary pulse={filteredPulse} />
        </div>
      ) : null}
    </section>
  );
}
