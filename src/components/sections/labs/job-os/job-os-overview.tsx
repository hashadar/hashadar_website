'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Text } from '@/components/ui';
import {
  JobOsLedger,
  JobOsLedgerCell,
  JobOsLedgerRow,
  JobOsPill,
  JobOsWorkspaceIntro,
} from '@/components/sections/labs/job-os/job-os-ledger';
import { jobOs } from '@/data';
import {
  type JobOs,
  type OverviewAttentionRow,
  type OverviewAttentionStatus,
} from '@/lib/job-os';
import { getDefaultJobOs } from '@/lib/job-os-default';

export type JobOsOverviewProps = {
  jobOsClient?: JobOs;
};

function statusPillTone(
  status: OverviewAttentionStatus,
): 'open' | 'pursuit' {
  return status === 'researching' ? 'pursuit' : 'open';
}

export function JobOsOverview({ jobOsClient }: JobOsOverviewProps = {}) {
  const copy = jobOs.overview;
  const [rows, setRows] = useState<OverviewAttentionRow[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resolved = jobOsClient ?? (await getDefaultJobOs());
        if (cancelled) {
          return;
        }
        const listed = await resolved.listOverviewAttention();
        if (cancelled) {
          return;
        }
        setRows(listed);
        setLoadState('ready');
      } catch {
        if (!cancelled) {
          setLoadState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobOsClient]);

  if (loadState === 'loading') {
    return <Text variant="muted">{copy.loadingLabel}</Text>;
  }
  if (loadState === 'error') {
    return <Text variant="muted">{copy.errorLabel}</Text>;
  }

  return (
    <div className="space-y-6">
      <JobOsWorkspaceIntro
        heading={copy.heading}
        description={copy.description}
      />

      <JobOsLedger
        caption={copy.heading}
        columns={[
          copy.columnEmployer,
          copy.columnOpportunity,
          copy.columnStatus,
          copy.columnTracking,
        ]}
        isEmpty={rows.length === 0}
        empty={
          <>
            {copy.emptyList}{' '}
            <Link
              href="/labs/job-os/opportunities"
              className="underline underline-offset-4 text-[var(--foreground)]"
            >
              {copy.emptyOpportunitiesCta}
            </Link>
          </>
        }
      >
        {rows.map((row) => {
          const href = `/labs/job-os/applications/${row.applicationId}`;
          const title =
            row.opportunityTitle.trim() || copy.untitledOpportunityLabel;
          const statusLabel =
            copy.statusOptions[row.status] ?? row.status;
          const statusTitle =
            row.status === 'researching'
              ? copy.statusHints.researching
              : undefined;

          return (
            <JobOsLedgerRow key={row.applicationId}>
              <JobOsLedgerCell>
                <Link
                  href={href}
                  className="underline-offset-4 hover:underline"
                >
                  {row.employerName.trim() || copy.noTrackingNoteLabel}
                </Link>
              </JobOsLedgerCell>
              <JobOsLedgerCell>
                <Link
                  href={href}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {title}
                </Link>
              </JobOsLedgerCell>
              <JobOsLedgerCell>
                <Link href={href} title={statusTitle}>
                  <JobOsPill tone={statusPillTone(row.status)}>
                    {statusLabel}
                  </JobOsPill>
                </Link>
              </JobOsLedgerCell>
              <JobOsLedgerCell>
                <Link
                  href={href}
                  className="block underline-offset-4 hover:underline"
                >
                  {row.trackingNote ? (
                    <Text className="line-clamp-2 text-sm">
                      {row.trackingNote}
                    </Text>
                  ) : (
                    <span className="text-[var(--mono-500)]">
                      {copy.noTrackingNoteLabel}
                    </span>
                  )}
                </Link>
              </JobOsLedgerCell>
            </JobOsLedgerRow>
          );
        })}
      </JobOsLedger>
    </div>
  );
}
