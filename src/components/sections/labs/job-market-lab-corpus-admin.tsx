'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, SectionHeader, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import {
  archiveJobDescription,
  restoreJobDescription,
  type JobDescriptionCorpusRecord,
} from '@/lib/job-market-corpus';
import {
  createDefaultAmplifyCorpusDeps,
  type AmplifyCorpusDeps,
} from '@/lib/job-market-corpus-amplify';

export type JobMarketLabCorpusAdminProps = {
  corpus?: AmplifyCorpusDeps;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; records: JobDescriptionCorpusRecord[] }
  | { status: 'error' };

function statusLabel(status: JobDescriptionCorpusRecord['status']): string {
  return status === 'active'
    ? jobMarketLab.corpusAdmin.statusActiveLabel
    : jobMarketLab.corpusAdmin.statusArchivedLabel;
}

export function JobMarketLabCorpusAdmin({ corpus }: JobMarketLabCorpusAdminProps) {
  const { session, isLoading } = useSiteAuth();
  const [deps] = useState(
    () => corpus ?? createDefaultAmplifyCorpusDeps(),
  );
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    const records = await deps.listJobDescriptions();
    return records;
  }, [deps]);

  useEffect(() => {
    if (isLoading || session?.status !== 'authenticated') {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const records = await loadRecords();
        if (!cancelled) {
          setLoadState({ status: 'ready', records });
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
  }, [isLoading, session, loadRecords]);

  if (isLoading || session?.status !== 'authenticated') {
    return null;
  }

  async function refresh() {
    setLoadState({ status: 'loading' });
    try {
      const records = await loadRecords();
      setLoadState({ status: 'ready', records });
    } catch {
      setLoadState({ status: 'error' });
    }
  }

  async function handleArchive(id: string) {
    setPendingId(id);
    try {
      await archiveJobDescription(id, deps);
      await refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function handleRestore(id: string) {
    setPendingId(id);
    try {
      await restoreJobDescription(id, deps);
      await refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="mt-16 space-y-6" aria-labelledby="job-market-corpus-admin-heading">
      <div className="max-w-2xl space-y-4">
        <SectionHeader
          id="job-market-corpus-admin-heading"
          as="h2"
          size="md"
          animated={false}
          showLeftAccent={false}
        >
          {jobMarketLab.corpusAdmin.heading}
        </SectionHeader>
        <Text variant="muted">{jobMarketLab.corpusAdmin.description}</Text>
      </div>

      {loadState.status === 'loading' || loadState.status === 'idle' ? (
        <Text variant="muted">{jobMarketLab.corpusAdmin.loadingLabel}</Text>
      ) : null}

      {loadState.status === 'error' ? (
        <p
          role="alert"
          className="font-body text-lg leading-relaxed text-[var(--foreground)]"
        >
          {jobMarketLab.corpusAdmin.errorLabel}
        </p>
      ) : null}

      {loadState.status === 'ready' && loadState.records.length === 0 ? (
        <Text variant="muted">{jobMarketLab.corpusAdmin.emptyList}</Text>
      ) : null}

      {loadState.status === 'ready' && loadState.records.length > 0 ? (
        <ul className="space-y-4">
          {loadState.records.map((record) => (
            <li
              key={record.id}
              className="flex flex-col gap-3 border-b border-[color-mix(in_oklab,var(--foreground)_12%,transparent)] py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <Text className="font-medium">
                  {record.title?.trim() || jobMarketLab.corpusAdmin.untitledLabel}
                </Text>
                <Text size="sm" variant="muted" className="font-mono">
                  {record.id}
                </Text>
                <Text size="sm">{statusLabel(record.status)}</Text>
              </div>
              <div>
                {record.status === 'active' ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pendingId === record.id}
                    onClick={() => void handleArchive(record.id)}
                  >
                    {jobMarketLab.corpusAdmin.archiveLabel}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pendingId === record.id}
                    onClick={() => void handleRestore(record.id)}
                  >
                    {jobMarketLab.corpusAdmin.restoreLabel}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
