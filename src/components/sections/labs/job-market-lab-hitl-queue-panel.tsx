'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Heading, SectionHeader, Text } from '@/components/ui';
import { jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import {
  acceptScrapeCandidate,
  listPendingScrapeCandidates,
  rejectScrapeCandidate,
  uploadJobDescription,
  type AcceptScrapeCandidateResult,
  type RejectScrapeCandidateResult,
  type ScrapeCandidateRecord,
} from '@/lib/job-market-lab';
import {
  createDefaultAmplifyScrapeCandidateDeps,
} from '@/lib/scrape-candidates-amplify';

export type ScrapeCandidateQueueDeps = {
  listScrapeCandidates: () => Promise<ScrapeCandidateRecord[]>;
  getScrapeCandidate: (id: string) => Promise<ScrapeCandidateRecord | null>;
  saveScrapeCandidate: (record: ScrapeCandidateRecord) => Promise<void>;
};

export type AcceptScrapeCandidateFn = (
  id: string,
) => Promise<AcceptScrapeCandidateResult>;

export type RejectScrapeCandidateFn = (
  id: string,
) => Promise<RejectScrapeCandidateResult>;

export type JobMarketLabHitlQueuePanelProps = {
  scrapeCandidates?: ScrapeCandidateQueueDeps;
  acceptScrapeCandidateFn?: AcceptScrapeCandidateFn;
  rejectScrapeCandidateFn?: RejectScrapeCandidateFn;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; candidates: ScrapeCandidateRecord[] }
  | { status: 'error' };

type ActionFeedback =
  | { kind: 'accepted'; s3Key: string }
  | { kind: 'rejected' }
  | { kind: 'error'; reason: string };

function defaultAcceptFn(deps: ScrapeCandidateQueueDeps): AcceptScrapeCandidateFn {
  return (id) =>
    acceptScrapeCandidate(id, {
      ...deps,
      uploadJobDescription,
    });
}

function defaultRejectFn(deps: ScrapeCandidateQueueDeps): RejectScrapeCandidateFn {
  return (id) => rejectScrapeCandidate(id, deps);
}

export function JobMarketLabHitlQueuePanel({
  scrapeCandidates,
  acceptScrapeCandidateFn,
  rejectScrapeCandidateFn,
}: JobMarketLabHitlQueuePanelProps) {
  const { session, isLoading } = useSiteAuth();
  const [deps] = useState(
    () => scrapeCandidates ?? createDefaultAmplifyScrapeCandidateDeps(),
  );
  const acceptFn = acceptScrapeCandidateFn ?? defaultAcceptFn(deps);
  const rejectFn = rejectScrapeCandidateFn ?? defaultRejectFn(deps);
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'accept' | 'reject' | null>(
    null,
  );
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  const loadCandidates = useCallback(async () => {
    return listPendingScrapeCandidates(deps);
  }, [deps]);

  useEffect(() => {
    if (isLoading || session?.status !== 'authenticated') {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const candidates = await loadCandidates();
        if (!cancelled) {
          setLoadState({ status: 'ready', candidates });
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
  }, [isLoading, session, loadCandidates]);

  if (isLoading || session?.status !== 'authenticated') {
    return null;
  }

  async function refresh() {
    setLoadState({ status: 'loading' });
    try {
      const candidates = await loadCandidates();
      setLoadState({ status: 'ready', candidates });
    } catch {
      setLoadState({ status: 'error' });
    }
  }

  async function handleAccept(id: string) {
    setPendingId(id);
    setPendingAction('accept');
    setFeedback(null);
    try {
      const result = await acceptFn(id);
      if (result.status === 'accepted') {
        setFeedback({ kind: 'accepted', s3Key: result.s3Key });
        await refresh();
        return;
      }
      if (result.status === 'rejected') {
        setFeedback({ kind: 'error', reason: result.reason });
        return;
      }
      setFeedback({
        kind: 'error',
        reason: jobMarketLab.hitlQueue.actionErrorHeading,
      });
    } finally {
      setPendingId(null);
      setPendingAction(null);
    }
  }

  async function handleReject(id: string) {
    setPendingId(id);
    setPendingAction('reject');
    setFeedback(null);
    try {
      const result = await rejectFn(id);
      if (result.status === 'rejected') {
        setFeedback({ kind: 'rejected' });
        await refresh();
        return;
      }
      setFeedback({
        kind: 'error',
        reason: jobMarketLab.hitlQueue.actionErrorHeading,
      });
    } finally {
      setPendingId(null);
      setPendingAction(null);
    }
  }

  return (
    <section className="mt-16 space-y-6" aria-labelledby="job-market-hitl-heading">
      <div className="max-w-2xl space-y-4">
        <SectionHeader
          id="job-market-hitl-heading"
          as="h2"
          size="md"
          animated={false}
          showLeftAccent={false}
        >
          {jobMarketLab.hitlQueue.heading}
        </SectionHeader>
        <Text variant="muted">{jobMarketLab.hitlQueue.description}</Text>
      </div>

      {loadState.status === 'loading' || loadState.status === 'idle' ? (
        <Text variant="muted">{jobMarketLab.hitlQueue.loadingLabel}</Text>
      ) : null}

      {loadState.status === 'error' ? (
        <p
          role="alert"
          className="font-body text-lg leading-relaxed text-[var(--foreground)]"
        >
          {jobMarketLab.hitlQueue.errorLabel}
        </p>
      ) : null}

      {loadState.status === 'ready' && loadState.candidates.length === 0 ? (
        <Text variant="muted">{jobMarketLab.hitlQueue.emptyList}</Text>
      ) : null}

      {loadState.status === 'ready' && loadState.candidates.length > 0 ? (
        <ul className="space-y-4">
          {loadState.candidates.map((candidate) => (
            <li
              key={candidate.id}
              className="flex flex-col gap-3 border-b border-[color-mix(in_oklab,var(--foreground)_12%,transparent)] py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <Text className="font-medium">
                  {candidate.title?.trim() || jobMarketLab.hitlQueue.untitledLabel}
                </Text>
                <Text size="sm" variant="muted" className="font-mono">
                  {candidate.fileName}
                </Text>
                {candidate.source ? (
                  <Text size="sm" variant="muted">
                    {candidate.source}
                  </Text>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={pendingId === candidate.id}
                  onClick={() => void handleAccept(candidate.id)}
                >
                  {pendingId === candidate.id && pendingAction === 'accept'
                    ? jobMarketLab.hitlQueue.acceptingLabel
                    : jobMarketLab.hitlQueue.acceptLabel}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pendingId === candidate.id}
                  onClick={() => void handleReject(candidate.id)}
                >
                  {pendingId === candidate.id && pendingAction === 'reject'
                    ? jobMarketLab.hitlQueue.rejectingLabel
                    : jobMarketLab.hitlQueue.rejectLabel}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {feedback?.kind === 'accepted' ? (
        <p role="status" className="font-body text-base leading-relaxed text-[var(--foreground)]">
          {jobMarketLab.hitlQueue.acceptedMessage.replace('{s3Key}', feedback.s3Key)}
        </p>
      ) : null}

      {feedback?.kind === 'rejected' ? (
        <p role="status" className="font-body text-base leading-relaxed text-[var(--foreground)]">
          {jobMarketLab.hitlQueue.rejectedMessage}
        </p>
      ) : null}

      {feedback?.kind === 'error' ? (
        <div role="alert" className="space-y-2">
          <Heading as="h3" size="sm">
            {jobMarketLab.hitlQueue.actionErrorHeading}
          </Heading>
          <Text>{feedback.reason}</Text>
        </div>
      ) : null}
    </section>
  );
}
