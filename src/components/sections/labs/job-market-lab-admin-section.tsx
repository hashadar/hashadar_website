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
};

export function JobMarketLabAdminSection({
  startRecompute = defaultStartJobMarketRecompute,
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

  return (
    <div className="mt-16 max-w-2xl space-y-6 border-t border-[var(--border)] pt-12">
      <div className="space-y-3">
        <SectionHeader as="h2" size="md" animated={false} showLeftAccent>
          {jobMarketLab.admin.heading}
        </SectionHeader>
        <Text variant="muted">{jobMarketLab.admin.description}</Text>
      </div>

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
        <p role="status" className="font-body text-base leading-relaxed text-[var(--foreground)]">
          {jobMarketLab.admin.startedMessage.replace('{runId}', result.runId)}
        </p>
      ) : null}

      {result?.status === 'rejected' ? (
        <div role="alert" className="space-y-2">
          <Heading as="h3" size="sm">
            {jobMarketLab.admin.rejectedHeading}
          </Heading>
          <Text>{result.reason}</Text>
        </div>
      ) : null}
    </div>
  );
}
