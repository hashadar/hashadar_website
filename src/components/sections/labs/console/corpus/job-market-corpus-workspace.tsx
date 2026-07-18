'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Heading, Text } from '@/components/ui';
import { JobMarketCorpusJdDetail } from '@/components/sections/labs/console/corpus/job-market-corpus-jd-detail';
import { JobMarketCorpusJdTable } from '@/components/sections/labs/console/corpus/job-market-corpus-jd-table';
import { JobMarketCorpusRegistryPanel } from '@/components/sections/labs/console/corpus/job-market-corpus-registry-panel';
import { corpusFieldClassName } from '@/components/sections/labs/console/corpus/corpus-field-styles';
import { jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import type { JobDescriptionCorpusRecord } from '@/lib/job-market-corpus';
import {
  createDefaultAmplifyCorpusDeps,
  type AmplifyCorpusDeps,
} from '@/lib/job-market-corpus-amplify';
import {
  filterCorpusRecords,
  type CorpusStatusFilter,
  type CorpusTableFilters,
} from '@/lib/job-market-corpus-table';
import type { EmployerRecord } from '@/lib/job-market-employers';
import {
  createAmplifyMetadataDeps,
  createDefaultAmplifyEmployerDeps,
  type AmplifyEmployerDeps,
} from '@/lib/job-market-employers-amplify';
import {
  createDefaultFetchJobDescriptionMarkdownDeps,
} from '@/lib/fetch-job-description-markdown-client';
import type { FetchJobDescriptionMarkdownDeps } from '@/lib/fetch-job-description-markdown';
import type { UploadJobDescriptionDeps } from '@/lib/upload-job-description';
import type { ScrapeCandidateRecord } from '@/lib/scrape-candidates';
import type { AnalysisRunRecord } from '@/lib/job-market-analysis-runs';

export type JobMarketCorpusWorkspaceProps = {
  corpus?: AmplifyCorpusDeps;
  employers?: AmplifyEmployerDeps;
  markdownDeps?: FetchJobDescriptionMarkdownDeps;
  uploadDeps?: UploadJobDescriptionDeps;
  listPendingCandidates?: () => Promise<ScrapeCandidateRecord[]>;
  listRuns?: () => Promise<AnalysisRunRecord[]>;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      records: JobDescriptionCorpusRecord[];
      employers: EmployerRecord[];
    };

export function JobMarketCorpusWorkspace({
  corpus: corpusProp,
  employers: employersProp,
  markdownDeps: markdownDepsProp,
  uploadDeps,
  listPendingCandidates,
  listRuns,
}: JobMarketCorpusWorkspaceProps) {
  const copy = jobMarketLab.console.corpusWorkspace;
  const { session, isLoading } = useSiteAuth();
  const [corpus] = useState(
    () => corpusProp ?? createDefaultAmplifyCorpusDeps(),
  );
  const [employerDeps] = useState(
    () => employersProp ?? createDefaultAmplifyEmployerDeps(),
  );
  const [metadataDeps] = useState(() =>
    createAmplifyMetadataDeps(corpus, employerDeps),
  );
  const [markdownDeps, setMarkdownDeps] =
    useState<FetchJobDescriptionMarkdownDeps | null>(
      markdownDepsProp ?? null,
    );
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<CorpusTableFilters>({
    status: 'all',
    search: '',
    missingEmployer: false,
    missingPay: false,
  });

  const refresh = useCallback(async () => {
    const [records, employers] = await Promise.all([
      corpus.listJobDescriptions(),
      employerDeps.listEmployers(),
    ]);
    setLoadState({ status: 'ready', records, employers });
    return { records, employers };
  }, [corpus, employerDeps]);

  useEffect(() => {
    if (isLoading || session?.status !== 'authenticated') {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        if (!markdownDepsProp) {
          const deps = await createDefaultFetchJobDescriptionMarkdownDeps();
          if (!cancelled && deps) {
            setMarkdownDeps(deps);
          }
        }
        const next = await refresh();
        if (!cancelled) {
          setLoadState({
            status: 'ready',
            records: next.records,
            employers: next.employers,
          });
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
  }, [isLoading, session, refresh, markdownDepsProp]);

  const filteredRecords = useMemo(() => {
    if (loadState.status !== 'ready') {
      return [];
    }
    return filterCorpusRecords(loadState.records, filters);
  }, [loadState, filters]);

  const selectedRecord =
    loadState.status === 'ready' && selectedId
      ? (loadState.records.find((record) => record.id === selectedId) ?? null)
      : null;

  if (isLoading || session?.status !== 'authenticated') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="max-w-3xl space-y-2 border-l-4 border-l-[var(--primary)] pl-4">
        <Heading as="h2" size="md">
          {copy.heading}
        </Heading>
        <Text variant="muted">{copy.description}</Text>
      </div>

      {loadState.status === 'loading' ? (
        <Text variant="muted">{copy.loadingLabel}</Text>
      ) : null}

      {loadState.status === 'error' ? (
        <p role="alert" className="font-body text-base text-[var(--foreground)]">
          {copy.errorLabel}
        </p>
      ) : null}

      {loadState.status === 'ready' ? (
        <>
          <JobMarketCorpusRegistryPanel
            records={loadState.records}
            employers={loadState.employers}
            employerDeps={employerDeps}
            onChanged={refresh}
            listPendingCandidates={listPendingCandidates}
            listRuns={listRuns}
          />

          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1">
              <Text size="sm">{copy.searchLabel}</Text>
              <input
                className={corpusFieldClassName}
                value={filters.search}
                placeholder={copy.searchPlaceholder}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-1">
              <Text size="sm">{copy.statusFilterLabel}</Text>
              <select
                className={corpusFieldClassName}
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as CorpusStatusFilter,
                  }))
                }
              >
                <option value="all">{copy.statusFilterAll}</option>
                <option value="active">{copy.statusFilterActive}</option>
                <option value="archived">{copy.statusFilterArchived}</option>
              </select>
            </label>
            <label className="flex items-center gap-2 font-body text-sm">
              <input
                type="checkbox"
                checked={filters.missingEmployer}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    missingEmployer: event.target.checked,
                  }))
                }
              />
              {copy.missingEmployerFilterLabel}
            </label>
            <label className="flex items-center gap-2 font-body text-sm">
              <input
                type="checkbox"
                checked={filters.missingPay}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    missingPay: event.target.checked,
                  }))
                }
              />
              {copy.missingPayFilterLabel}
            </label>
            <Text size="sm" variant="muted">
              {copy.documentCountLabel.replace(
                '{count}',
                String(filteredRecords.length),
              )}
            </Text>
          </div>

          {loadState.records.length === 0 ? (
            <Text variant="muted">{copy.emptyLabel}</Text>
          ) : filteredRecords.length === 0 ? (
            <Text variant="muted">{copy.filteredEmptyLabel}</Text>
          ) : (
            <JobMarketCorpusJdTable
              records={filteredRecords}
              employers={loadState.employers}
              selectedId={selectedId}
              corpusDeps={corpus}
              onSelect={setSelectedId}
              onRecordsChanged={refresh}
            />
          )}

          {selectedRecord && markdownDeps ? (
            <JobMarketCorpusJdDetail
              record={selectedRecord}
              employers={loadState.employers}
              metadataDeps={metadataDeps}
              markdownDeps={markdownDeps}
              uploadDeps={uploadDeps}
              onClose={() => setSelectedId(null)}
              onChanged={refresh}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
