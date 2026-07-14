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
  const [compareState, setCompareState] = useState<CompareState>({ status: 'idle' });

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

  const copy = jobMarketLab.console.compare;
  const markdownFetcher = markdownDeps ?? resolvedMarkdownDeps;

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
    <section className="mt-16 space-y-6" aria-labelledby="job-market-compare-heading">
      <div className="max-w-2xl space-y-4">
        <SectionHeader
          id="job-market-compare-heading"
          as="h2"
          size="md"
          animated={false}
          showLeftAccent={false}
        >
          {copy.heading}
        </SectionHeader>
        <Text variant="muted">{copy.description}</Text>
      </div>

      {loadState.status === 'loading' || loadState.status === 'idle' ? (
        <Text variant="muted">{copy.loadingJdsLabel}</Text>
      ) : null}

      {loadState.status === 'error' ? (
        <p
          role="alert"
          className="font-body text-lg leading-relaxed text-[var(--foreground)]"
        >
          {copy.errorLabel}
        </p>
      ) : null}

      {loadState.status === 'ready' ? (
        <div className="max-w-2xl space-y-4">
          <label className="block space-y-2" htmlFor="job-market-compare-jd">
            <Text size="sm">{copy.selectLabel}</Text>
            <select
              id="job-market-compare-jd"
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setCompareState({ status: 'idle' });
              }}
              className="block w-full rounded border border-[var(--border)] bg-[var(--background)] p-3 font-body text-base text-[var(--foreground)]"
            >
              <option value="">{copy.noSelectionOption}</option>
              {loadState.records.map((record) => (
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
          className="font-body text-lg leading-relaxed text-[var(--foreground)]"
        >
          {compareState.message}
        </p>
      ) : null}

      {compareState.status === 'ready' ? (
        <div className="max-w-2xl space-y-8">
          <div className="space-y-3">
            <SectionHeader as="h3" size="sm" animated={false} showLeftAccent={false}>
              {copy.matchesHeading}
            </SectionHeader>
            {compareState.result.matches.length === 0 ? (
              <Text variant="muted">{copy.matchesEmpty}</Text>
            ) : (
              <ul className="list-disc space-y-1 pl-5">
                {compareState.result.matches.map((item) => (
                  <li key={item.name}>
                    <Text>{item.name}</Text>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <SectionHeader as="h3" size="sm" animated={false} showLeftAccent={false}>
              {copy.gapsHeading}
            </SectionHeader>
            {compareState.result.gaps.length === 0 ? (
              <Text variant="muted">{copy.gapsEmpty}</Text>
            ) : (
              <ul className="list-disc space-y-1 pl-5">
                {compareState.result.gaps.map((item) => (
                  <li key={item.name}>
                    <Text>{item.name}</Text>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <SectionHeader as="h3" size="sm" animated={false} showLeftAccent={false}>
              {copy.talkingPointsHeading}
            </SectionHeader>
            {compareState.result.talkingPoints.length === 0 ? (
              <Text variant="muted">{copy.talkingPointsEmpty}</Text>
            ) : (
              <ul className="list-disc space-y-1 pl-5">
                {compareState.result.talkingPoints.map((point) => (
                  <li key={point}>
                    <Text>{point}</Text>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <SectionHeader as="h3" size="sm" animated={false} showLeftAccent={false}>
              {copy.learningTargetsHeading}
            </SectionHeader>
            {compareState.result.learningTargets.length === 0 ? (
              <Text variant="muted">{copy.learningTargetsEmpty}</Text>
            ) : (
              <ul className="list-disc space-y-1 pl-5">
                {compareState.result.learningTargets.map((target) => (
                  <li key={target}>
                    <Text>{target}</Text>
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
