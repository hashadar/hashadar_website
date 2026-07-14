'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, SectionHeader, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import {
  getPublishedJobMarketSnapshot,
  setThemeLabelOverride,
  type ClusterSummary,
  type GetPublishedJobMarketSnapshotDeps,
  type ListThemeLabelOverridesDeps,
  type SetThemeLabelOverrideDeps,
} from '@/lib/job-market-lab';
import { createDefaultAmplifyThemeLabelOverrideDeps } from '@/lib/job-market-theme-labels-amplify';

export type JobMarketLabThemeLabelsPanelProps = {
  publication?: GetPublishedJobMarketSnapshotDeps;
  themeLabels?: ListThemeLabelOverridesDeps & SetThemeLabelOverrideDeps;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; clusters: ClusterSummary[] }
  | { status: 'error' };

function formatSavedMessage(clusterKey: string): string {
  return jobMarketLab.console.themeLabelSavedMessage.replace('{clusterKey}', clusterKey);
}

export function JobMarketLabThemeLabelsPanel({
  publication,
  themeLabels,
}: JobMarketLabThemeLabelsPanelProps) {
  const { session, isLoading } = useSiteAuth();
  const [deps] = useState(
    () => themeLabels ?? createDefaultAmplifyThemeLabelOverrideDeps(),
  );
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const loadClusters = useCallback(async () => {
    const result = await getPublishedJobMarketSnapshot(publication);
    if (result.status === 'empty') {
      return { status: 'empty' as const };
    }
    return {
      status: 'ready' as const,
      clusters: result.snapshot.clusters,
    };
  }, [publication]);

  useEffect(() => {
    if (isLoading || session?.status !== 'authenticated') {
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoadState({ status: 'loading' });
      try {
        const next = await loadClusters();
        if (!cancelled) {
          setLoadState(next);
          if (next.status === 'ready') {
            setDraftLabels(
              Object.fromEntries(
                next.clusters.map((cluster) => [String(cluster.id), cluster.label]),
              ),
            );
          }
        }
      } catch {
        if (!cancelled) {
          setLoadState({ status: 'error' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, session, loadClusters]);

  if (isLoading || session?.status !== 'authenticated') {
    return null;
  }

  async function handleSave(clusterKey: string) {
    const label = draftLabels[clusterKey]?.trim();
    if (!label) {
      return;
    }

    setPendingKey(clusterKey);
    setSavedKey(null);
    try {
      await setThemeLabelOverride(clusterKey, label, deps);
      setSavedKey(clusterKey);
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <section className="mt-16 space-y-6" aria-labelledby="job-market-theme-labels-heading">
      <div className="space-y-2">
        <SectionHeader
          id="job-market-theme-labels-heading"
          as="h2"
          size="md"
          animated={false}
          showLeftAccent={false}
        >
          {jobMarketLab.console.themeLabelsHeading}
        </SectionHeader>
        <Text variant="muted">{jobMarketLab.console.themeLabelsDescription}</Text>
      </div>

      {loadState.status === 'loading' || loadState.status === 'idle' ? (
        <Text variant="muted">{jobMarketLab.console.themeLabelsLoading}</Text>
      ) : null}

      {loadState.status === 'error' ? (
        <p role="alert" className="font-body text-lg leading-relaxed text-[var(--foreground)]">
          {jobMarketLab.console.themeLabelsError}
        </p>
      ) : null}

      {loadState.status === 'empty' ? (
        <Text>{jobMarketLab.console.themeLabelsEmpty}</Text>
      ) : null}

      {loadState.status === 'ready' ? (
        <ul className="space-y-4">
          {loadState.clusters.map((cluster) => {
            const clusterKey = String(cluster.id);
            const inputId = `theme-label-${clusterKey}`;
            return (
              <li
                key={clusterKey}
                className="grid gap-3 border border-[color-mix(in_oklab,var(--foreground)_14%,transparent)] p-4 md:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="space-y-2">
                  <label className="block space-y-2" htmlFor={inputId}>
                    <Text size="sm" variant="muted">
                      {jobMarketLab.console.themeLabelInputLabel} ·{' '}
                      {jobMarketLab.console.themeLabelSizeLabel}: {cluster.size}
                    </Text>
                    <input
                      id={inputId}
                      className="w-full border border-[color-mix(in_oklab,var(--foreground)_18%,transparent)] bg-transparent px-3 py-2 font-body text-sm"
                      value={draftLabels[clusterKey] ?? cluster.label}
                      onChange={(event) => {
                        setDraftLabels((current) => ({
                          ...current,
                          [clusterKey]: event.target.value,
                        }));
                        setSavedKey(null);
                      }}
                    />
                  </label>
                  {savedKey === clusterKey ? (
                    <p
                      role="status"
                      className="font-body text-base leading-normal text-[var(--foreground)]"
                    >
                      {formatSavedMessage(clusterKey)}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pendingKey === clusterKey}
                  onClick={() => {
                    void handleSave(clusterKey);
                  }}
                >
                  {pendingKey === clusterKey
                    ? jobMarketLab.console.themeLabelSavingLabel
                    : jobMarketLab.console.themeLabelSaveLabel}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
