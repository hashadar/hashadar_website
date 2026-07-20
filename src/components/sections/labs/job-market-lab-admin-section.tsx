'use client';

import { useState } from 'react';
import {
  Button,
  Heading,
  SectionHeader,
  Text,
} from '@/components/ui';
import { jobMarketLab } from '@/data';
import { useSiteAuth } from '@/hooks/use-site-auth';
import type {
  StartJobMarketRecompute,
  StartJobMarketRecomputeResult,
} from '@/lib/job-market-lab';
import { defaultStartJobMarketRecompute } from '@/lib/start-job-market-recompute-client';

export type JobMarketLabAdminSectionProps = {
  startRecompute?: StartJobMarketRecompute;
  /** Primary (analytics) uses the runs-hint started message; secondary is denser for Runs audit. */
  variant?: 'primary' | 'secondary';
};

export function JobMarketLabAdminSection({
  startRecompute = defaultStartJobMarketRecompute,
  variant = 'secondary',
}: JobMarketLabAdminSectionProps) {
  const { session, isLoading } = useSiteAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [result, setResult] = useState<StartJobMarketRecomputeResult | null>(null);

  if (isLoading || session === null || session.status !== 'authenticated') {
    return null;
  }

  async function handleStart() {
    setIsStarting(true);
    setResult(null);
    const next = await startRecompute();
    setResult(next);
    setIsStarting(false);
  }

  const startedMessage =
    variant === 'primary'
      ? jobMarketLab.admin.startedMessageWithRunsHint
      : jobMarketLab.admin.startedMessage;

  return (
    <div
      className={
        variant === 'primary'
          ? 'space-y-4'
          : 'space-y-4 border-t border-[var(--border)] pt-6'
      }
    >
      {variant === 'secondary' ? (
        <div className="space-y-2">
          <SectionHeader as="h2" size="sm" animated={false} showLeftAccent>
            {jobMarketLab.admin.heading}
          </SectionHeader>
          <Text size="sm" variant="muted">
            {jobMarketLab.admin.secondaryStartDescription}
          </Text>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={() => void handleStart()}
        disabled={isStarting}
      >
        {isStarting
          ? jobMarketLab.admin.startingLabel
          : jobMarketLab.admin.startButtonLabel}
      </Button>

      {result?.status === 'started' ? (
        <p role="status" className="font-body text-sm leading-relaxed text-[var(--foreground)]">
          {startedMessage.replace('{runId}', result.runId)}
        </p>
      ) : null}

      {result?.status === 'rejected' ? (
        <div role="alert" className="space-y-2">
          <Heading as="h3" size="sm">
            {jobMarketLab.admin.rejectedHeading}
          </Heading>
          <Text size="sm">{result.reason}</Text>
        </div>
      ) : null}
    </div>
  );
}
