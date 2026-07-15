'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, SectionHeader, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import { getCanonicalCv, type CanonicalCvDeps } from '@/lib/canonical-cv';
import { createDefaultAmplifyCanonicalCvDeps } from '@/lib/canonical-cv-amplify';
import {
  compareCvToMarket,
  filterJobMarketPulse,
  fetchOwnerJobMarketPulseSource,
  type CvJdComparisonResult,
  type FetchOwnerJobMarketPulseSourceDeps,
} from '@/lib/job-market-lab';

export type JobMarketLabMarketComparePanelProps = {
  canonicalCv?: CanonicalCvDeps;
  ownerPulse?: FetchOwnerJobMarketPulseSourceDeps;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'empty' }
  | { status: 'error' };

type CompareState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'ready'; result: CvJdComparisonResult }
  | { status: 'error'; message: string };

function comparisonTemplates() {
  const copy = jobMarketLab.console.marketCompare;
  return {
    matchTalkingPoint: copy.matchTalkingPointTemplate,
    gapTalkingPoint: copy.gapTalkingPointTemplate,
    gapLearningTarget: copy.gapLearningTargetTemplate,
  };
}

export function JobMarketLabMarketComparePanel({
  canonicalCv,
  ownerPulse,
}: JobMarketLabMarketComparePanelProps) {
  const { session, isLoading } = useSiteAuth();
  const [cvDeps] = useState(() => canonicalCv ?? createDefaultAmplifyCanonicalCvDeps());
  const [pulseDeps] = useState<FetchOwnerJobMarketPulseSourceDeps>(
    () => ownerPulse ?? {},
  );
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const [compareState, setCompareState] = useState<CompareState>({ status: 'idle' });

  const loadPulse = useCallback(async () => {
    return fetchOwnerJobMarketPulseSource(pulseDeps);
  }, [pulseDeps]);

  useEffect(() => {
    if (isLoading || session?.status !== 'authenticated') {
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoadState({ status: 'loading' });
      try {
        const source = await loadPulse();
        if (cancelled) {
          return;
        }
        if (source == null) {
          setLoadState({ status: 'empty' });
          return;
        }
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
  }, [isLoading, session, loadPulse]);

  if (isLoading || session?.status !== 'authenticated') {
    return null;
  }

  const copy = jobMarketLab.console.marketCompare;

  async function handleCompare() {
    const compareCopy = jobMarketLab.console.marketCompare;

    if (loadState.status === 'empty') {
      setCompareState({
        status: 'error',
        message: compareCopy.noPulseError,
      });
      return;
    }

    if (loadState.status === 'error') {
      setCompareState({
        status: 'error',
        message: compareCopy.errorLabel,
      });
      return;
    }

    setCompareState({ status: 'running' });

    try {
      const source = await loadPulse();
      if (source == null) {
        setCompareState({
          status: 'error',
          message: compareCopy.noPulseError,
        });
        return;
      }

      const cvRecord = await getCanonicalCv(cvDeps);
      const cvBody = cvRecord?.body.trim() ?? '';
      if (cvBody === '') {
        setCompareState({
          status: 'error',
          message: compareCopy.noCvError,
        });
        return;
      }

      const pulse = filterJobMarketPulse(
        { snapshot: source.snapshot, corpusMeta: source.corpusMeta },
        {},
        { audience: 'owner' },
      );

      const result = compareCvToMarket({
        cvBody,
        technologies: pulse.technologies,
        themes: pulse.clusters,
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
    <section className="mt-16 space-y-6" aria-labelledby="job-market-market-compare-heading">
      <div className="max-w-2xl space-y-4">
        <SectionHeader
          id="job-market-market-compare-heading"
          as="h2"
          size="md"
          animated={false}
          showLeftAccent
        >
          {copy.heading}
        </SectionHeader>
        <Text variant="muted">{copy.description}</Text>
      </div>

      {loadState.status === 'loading' || loadState.status === 'idle' ? (
        <Text variant="muted">{copy.loadingPulseLabel}</Text>
      ) : null}

      {loadState.status === 'error' ? (
        <p
          role="alert"
          className="font-body text-lg leading-relaxed text-[var(--foreground)]"
        >
          {copy.errorLabel}
        </p>
      ) : null}

      {loadState.status === 'ready' || loadState.status === 'empty' ? (
        <div className="max-w-2xl space-y-4">
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
