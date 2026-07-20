'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, SectionHeader, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import { getCanonicalCv, type CanonicalCvDeps } from '@/lib/canonical-cv';
import { createDefaultAmplifyCanonicalCvDeps } from '@/lib/canonical-cv-amplify';
import { compareCvToJobDescription, type CvJdComparisonResult } from '@/lib/compare-cv-to-job-description';
import {
  fetchJobDescriptionMarkdown,
  type FetchJobDescriptionMarkdownDeps,
} from '@/lib/fetch-job-description-markdown';
import { createDefaultFetchJobDescriptionMarkdownDeps } from '@/lib/fetch-job-description-markdown-client';
import {
  selectActiveCorpus,
  type JobDescriptionCorpusRecord,
} from '@/lib/job-market-corpus';
import {
  createDefaultAmplifyCorpusDeps,
  type AmplifyCorpusDeps,
} from '@/lib/job-market-corpus-amplify';

export type JobMarketLabComparePanelProps = {
  corpus?: AmplifyCorpusDeps;
  canonicalCv?: CanonicalCvDeps;
  markdown?: FetchJobDescriptionMarkdownDeps;
  embedded?: boolean;
  /** When false, hide the panel chrome (used by fit workspace mode tabs). */
  showHeading?: boolean;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; records: JobDescriptionCorpusRecord[] }
  | { status: 'error' };

type CompareState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'ready'; result: CvJdComparisonResult }
  | { status: 'error'; message: string };

function comparisonTemplates() {
  const copy = jobMarketLab.console.compare;
  return {
    matchTalkingPoint: copy.matchTalkingPointTemplate,
    gapTalkingPoint: copy.gapTalkingPointTemplate,
    gapLearningTarget: copy.gapLearningTargetTemplate,
  };
}

export function JobMarketLabComparePanel({
  corpus,
  canonicalCv,
  markdown,
  embedded = false,
  showHeading = true,
}: JobMarketLabComparePanelProps) {
  const { session, isLoading } = useSiteAuth();
  const [corpusDeps] = useState(() => corpus ?? createDefaultAmplifyCorpusDeps());
  const [cvDeps] = useState(() => canonicalCv ?? createDefaultAmplifyCanonicalCvDeps());
  const [markdownDeps] = useState<FetchJobDescriptionMarkdownDeps | null>(
    () => markdown ?? null,
  );
  const [resolvedMarkdownDeps, setResolvedMarkdownDeps] =
    useState<FetchJobDescriptionMarkdownDeps | null>(markdownDeps);
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const [selectedId, setSelectedId] = useState('');
  const [jdSearch, setJdSearch] = useState('');
  const [compareState, setCompareState] = useState<CompareState>({ status: 'idle' });
  const [hasSavedCv, setHasSavedCv] = useState<boolean | null>(null);

  const loadRecords = useCallback(async () => {
    const records = await corpusDeps.listJobDescriptions();
    return selectActiveCorpus(records);
  }, [corpusDeps]);

  useEffect(() => {
    if (markdownDeps || isLoading || session?.status !== 'authenticated') {
      return;
    }

    let cancelled = false;

    void (async () => {
      const deps = await createDefaultFetchJobDescriptionMarkdownDeps();
      if (!cancelled) {
        setResolvedMarkdownDeps(deps);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [markdownDeps, isLoading, session]);

  useEffect(() => {
    if (isLoading || session?.status !== 'authenticated') {
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoadState({ status: 'loading' });
      try {
        const [records, cvRecord] = await Promise.all([
          loadRecords(),
          getCanonicalCv(cvDeps),
        ]);
        if (!cancelled) {
          setLoadState({ status: 'ready', records });
          setHasSavedCv(Boolean(cvRecord?.body.trim()));
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
  }, [isLoading, session, loadRecords, cvDeps]);

  if (isLoading || session?.status !== 'authenticated') {
    return null;
  }

  const copy = jobMarketLab.console.compare;
  const fitCopy = jobMarketLab.console.fitWorkspace;
  const markdownFetcher = markdownDeps ?? resolvedMarkdownDeps;
  const filteredRecords =
    loadState.status === 'ready'
      ? loadState.records.filter((record) => {
          const query = jdSearch.trim().toLowerCase();
          if (!query) return true;
          const title = (record.title ?? '').toLowerCase();
          return title.includes(query) || record.id.toLowerCase().includes(query);
        })
      : [];

  async function handleCompare() {
    const compareCopy = jobMarketLab.console.compare;

    if (!selectedId) {
      setCompareState({
        status: 'error',
        message: compareCopy.noJdSelectedError,
      });
      return;
    }

    if (!markdownFetcher) {
      setCompareState({
        status: 'error',
        message: compareCopy.errorLabel,
      });
      return;
    }

    setCompareState({ status: 'running' });

    try {
      const cvRecord = await getCanonicalCv(cvDeps);
      const cvBody = cvRecord?.body.trim() ?? '';
      if (cvBody === '') {
        setCompareState({
          status: 'error',
          message: compareCopy.noCvError,
        });
        return;
      }

      const selected = loadState.status === 'ready'
        ? loadState.records.find((record) => record.id === selectedId)
        : undefined;
      const s3Key = selected?.s3Key?.trim();
      if (!s3Key) {
        setCompareState({
          status: 'error',
          message: compareCopy.missingMarkdownError,
        });
        return;
      }

      const jdMarkdown = await fetchJobDescriptionMarkdown(s3Key, markdownFetcher);
      if (!jdMarkdown) {
        setCompareState({
          status: 'error',
          message: compareCopy.missingMarkdownError,
        });
        return;
      }

      const result = compareCvToJobDescription({
        cvBody,
        jdMarkdown,
        templates: comparisonTemplates(),
      });
      setCompareState({ status: 'ready', result });
    } catch {
      setCompareState({
        status: 'error',
        message: compareCopy.errorLabel,
      });
    }
  }

  return (
    <section
      className={embedded ? 'space-y-4' : 'mt-16 space-y-6'}
      aria-labelledby="job-market-compare-heading"
    >
      {showHeading ? (
        <div className={embedded ? 'space-y-2' : 'max-w-2xl space-y-4'}>
          <SectionHeader
            id="job-market-compare-heading"
            as={embedded ? 'h3' : 'h2'}
            size={embedded ? 'sm' : 'md'}
            animated={false}
            showLeftAccent={!embedded}
          >
            {copy.heading}
          </SectionHeader>
          {embedded ? null : <Text variant="muted">{copy.description}</Text>}
        </div>
      ) : null}

      {loadState.status === 'loading' || loadState.status === 'idle' ? (
        <Text variant="muted">{copy.loadingJdsLabel}</Text>
      ) : null}

      {loadState.status === 'error' ? (
        <p
          role="alert"
          className="font-body text-base leading-relaxed text-[var(--foreground)]"
        >
          {copy.errorLabel}
        </p>
      ) : null}

      {loadState.status === 'ready' ? (
        <div className={embedded ? 'space-y-3' : 'max-w-2xl space-y-4'}>
          {embedded && hasSavedCv === false ? (
            <p role="status" className="font-body text-sm text-[var(--mono-500)]">
              {fitCopy.saveCvFirstHint}
            </p>
          ) : null}
          {embedded ? (
            <label className="block space-y-1" htmlFor="job-market-compare-jd-search">
              <Text size="sm">{fitCopy.jdSearchLabel}</Text>
              <input
                id="job-market-compare-jd-search"
                className="w-full rounded-md border border-[color-mix(in_oklab,var(--foreground)_20%,transparent)] bg-transparent px-2 py-1.5 font-body text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)]"
                value={jdSearch}
                onChange={(event) => setJdSearch(event.target.value)}
                placeholder={fitCopy.jdSearchPlaceholder}
              />
            </label>
          ) : null}
          <label className="block space-y-2" htmlFor="job-market-compare-jd">
            <Text size="sm">{copy.selectLabel}</Text>
            <select
              id="job-market-compare-jd"
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setCompareState({ status: 'idle' });
              }}
              className={
                embedded
                  ? 'block w-full rounded-md border border-[color-mix(in_oklab,var(--foreground)_20%,transparent)] bg-transparent px-2 py-1.5 font-body text-sm text-[var(--foreground)]'
                  : 'block w-full rounded border border-[var(--border)] bg-[var(--background)] p-3 font-body text-base text-[var(--foreground)]'
              }
            >
              <option value="">{copy.noSelectionOption}</option>
              {filteredRecords.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.title?.trim() || jobMarketLab.corpusAdmin.untitledLabel}
                </option>
              ))}
            </select>
          </label>

          <Button
            type="button"
            onClick={() => void handleCompare()}
            disabled={compareState.status === 'running'}
          >
            {compareState.status === 'running' ? copy.runningLabel : copy.runButtonLabel}
          </Button>
        </div>
      ) : null}

      {compareState.status === 'error' ? (
        <p
          role="alert"
          className="font-body text-base leading-relaxed text-[var(--foreground)]"
        >
          {compareState.message}
        </p>
      ) : null}

      {compareState.status === 'ready' ? (
        <div className={embedded ? 'space-y-5' : 'max-w-2xl space-y-8'}>
          {embedded ? (
            <SectionHeader as="h3" size="sm" animated={false} showLeftAccent={false}>
              {fitCopy.resultsHeading}
            </SectionHeader>
          ) : null}
          <div className="space-y-2">
            <SectionHeader as="h3" size="sm" animated={false} showLeftAccent={false}>
              {copy.matchesHeading}
            </SectionHeader>
            {compareState.result.matches.length === 0 ? (
              <Text size="sm" variant="muted">
                {copy.matchesEmpty}
              </Text>
            ) : (
              <ul className="list-disc space-y-0.5 pl-5">
                {compareState.result.matches.map((item) => (
                  <li key={item.name}>
                    <Text size="sm">{item.name}</Text>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <SectionHeader as="h3" size="sm" animated={false} showLeftAccent={false}>
              {copy.gapsHeading}
            </SectionHeader>
            {compareState.result.gaps.length === 0 ? (
              <Text size="sm" variant="muted">
                {copy.gapsEmpty}
              </Text>
            ) : (
              <ul className="list-disc space-y-0.5 pl-5">
                {compareState.result.gaps.map((item) => (
                  <li key={item.name}>
                    <Text size="sm">{item.name}</Text>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <SectionHeader as="h3" size="sm" animated={false} showLeftAccent={false}>
              {copy.talkingPointsHeading}
            </SectionHeader>
            {compareState.result.talkingPoints.length === 0 ? (
              <Text size="sm" variant="muted">
                {copy.talkingPointsEmpty}
              </Text>
            ) : (
              <ul className="list-disc space-y-0.5 pl-5">
                {compareState.result.talkingPoints.map((point) => (
                  <li key={point}>
                    <Text size="sm">{point}</Text>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <SectionHeader as="h3" size="sm" animated={false} showLeftAccent={false}>
              {copy.learningTargetsHeading}
            </SectionHeader>
            {compareState.result.learningTargets.length === 0 ? (
              <Text size="sm" variant="muted">
                {copy.learningTargetsEmpty}
              </Text>
            ) : (
              <ul className="list-disc space-y-0.5 pl-5">
                {compareState.result.learningTargets.map((target) => (
                  <li key={target}>
                    <Text size="sm">{target}</Text>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
