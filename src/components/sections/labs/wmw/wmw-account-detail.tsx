'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heading, Text } from '@/components/ui';
import {
  momDeltaClassName,
  WmwDenseCell,
  WmwDenseRow,
  WmwDenseTable,
} from '@/components/sections/labs/wmw/wmw-dense-table';
import {
  formatSignedGbp,
  formatSignedRate,
  WmwAccountLeg,
} from '@/components/sections/labs/wmw/wmw-account-leg';
import { WmwSeriesChart } from '@/components/sections/labs/wmw/wmw-series-chart';
import { wmw } from '@/data';
import type { WmwFacade } from '@/lib/wmw/facade';
import {
  formatAsOf,
  formatCalendarMonth,
  formatGbp,
} from '@/lib/wmw/format';
import {
  buildWmwAccountDetailView,
  type WmwAccountDetailView,
} from '@/lib/wmw/account-detail-view';
import { getDefaultWmw } from '@/lib/wmw-default';
import { cn } from '@/lib/utils';

export type WmwAccountDetailProps = {
  accountId: string;
  /** Injectable facade for Vitest; defaults to Amplify-backed client. */
  wmwClient?: WmwFacade;
};

type LoadState = 'loading' | 'ready' | 'error';
export function WmwAccountDetail({
  accountId,
  wmwClient,
}: WmwAccountDetailProps) {
  const copy = wmw.accountDetail;
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [view, setView] = useState<WmwAccountDetailView | null>(null);
  const [defaultClient, setDefaultClient] = useState<WmwFacade | null>(null);
  const client = wmwClient ?? defaultClient;

  useEffect(() => {
    if (wmwClient) return;
    let cancelled = false;
    void (async () => {
      const resolved = await getDefaultWmw();
      if (!cancelled) setDefaultClient(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [wmwClient]);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    void (async () => {
      try {
        const snapshot = await client.getSnapshot();
        if (cancelled) return;
        setView(buildWmwAccountDetailView(snapshot, accountId));
        setLoadState('ready');
      } catch {
        if (!cancelled) setLoadState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, accountId]);

  if (loadState === 'loading' || !client) {
    return <Text variant="muted">{copy.loadingLabel}</Text>;
  }

  if (loadState === 'error') {
    return <Text variant="muted">{copy.errorLabel}</Text>;
  }

  if (!view || view.status === 'not-found') {
    return (
      <div className="max-w-xl space-y-2">
        <Heading size="sm" as="h2">
          {copy.notFoundHeading}
        </Heading>
        <Text variant="muted" className="text-sm">
          {copy.notFoundDescription}
        </Text>
        <Link
          href="/labs/wmw"
          className="inline-flex font-body text-sm text-[var(--foreground)] underline underline-offset-4"
        >
          {copy.backToOverviewLabel}
        </Link>
      </div>
    );
  }

  const position = view.position;
  const roleLabel = (role: 'asset' | 'liability') =>
    role === 'asset' ? copy.roleAssetLabel : copy.roleLiabilityLabel;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-0.5">
          <Heading size="sm" as="h2">
            {position ? position.name : view.account.accountName}
          </Heading>
          <Text variant="muted" className="text-sm">
            {wmw.overview.asOfLabel}:{' '}
            <span className="tabular-nums">{formatAsOf(view.asOf)}</span>
          </Text>
        </div>
        <Link
          href="/labs/wmw"
          className="inline-flex font-body text-sm text-[var(--foreground)] underline underline-offset-4"
        >
          {copy.backToOverviewLabel}
        </Link>
      </div>

      {position ? (
        <>
          <section
            aria-label={copy.netEquityLabel}
            className="space-y-3 border-b border-[var(--border)] pb-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-body text-[0.65rem] uppercase tracking-[0.08em] text-[var(--mono-500)]">
                  {copy.netEquityLabel}
                </p>
                <p className="mt-0.5 font-mono text-2xl tabular-nums text-[var(--foreground)]">
                  {position.netEquity === null
                    ? '—'
                    : formatGbp(position.netEquity, true)}
                </p>
                <p
                  className={cn(
                    'mt-1 flex flex-wrap gap-x-3 font-mono text-sm tabular-nums',
                    momDeltaClassName(position.netMomDelta),
                  )}
                >
                  <span>
                    {position.netMomDelta === null
                      ? '—'
                      : formatSignedGbp(position.netMomDelta)}
                  </span>
                  <span>
                    {position.netMomPct === null
                      ? '—'
                      : formatSignedRate(position.netMomPct)}
                  </span>
                </p>
                {position.negativeEquity ? (
                  <p className="mt-1 font-body text-sm text-[var(--foreground)]">
                    {copy.negativeEquityLabel}
                  </p>
                ) : null}
              </div>
              {position.latestMonth ? (
                <Text variant="muted" className="text-sm tabular-nums">
                  {formatCalendarMonth(position.latestMonth)}
                </Text>
              ) : null}
            </div>

            <WmwDenseTable
              caption={copy.breakdownHeading}
              columns={[
                copy.columnAccount,
                copy.columnRole,
                { label: copy.columnBalance, align: 'right' },
                { label: copy.columnContribution, align: 'right' },
              ]}
              isEmpty={position.legs.length === 0}
              empty={copy.balanceEmptyLabel}
            >
              {position.legs.map((leg) => (
                <WmwDenseRow key={leg.accountId}>
                  <WmwDenseCell>{leg.accountName}</WmwDenseCell>
                  <WmwDenseCell>{roleLabel(leg.role)}</WmwDenseCell>
                  <WmwDenseCell mono align="right">
                    {leg.recorded
                      ? formatGbp(leg.balance, true)
                      : copy.legNotRecordedLabel}
                  </WmwDenseCell>
                  <WmwDenseCell mono align="right">
                    {formatGbp(leg.contribution, true)}
                  </WmwDenseCell>
                </WmwDenseRow>
              ))}
            </WmwDenseTable>

            <div className="space-y-2">
              <Heading size="sm" as="h3">
                {copy.netHistoryHeading}
              </Heading>
              {position.netHistory.length === 0 ? (
                <Text variant="muted" className="text-sm">
                  {copy.seriesEmptyLabel}
                </Text>
              ) : (
                <WmwSeriesChart
                  size="compact"
                  points={position.netHistory.map((point) => ({
                    label: formatCalendarMonth(point.month),
                    value: point.netEquity,
                  }))}
                  ariaLabel={copy.netHistoryChartAriaLabel}
                  formatValue={(value) => formatGbp(value)}
                  formatHoverValue={(value) => formatGbp(value, true)}
                />
              )}
            </div>
          </section>

          {position.legDetails.map((leg) => {
            const legHeading = `${roleLabel(leg.role)}: ${leg.account.accountName}`;
            return (
              <section
                key={leg.account.accountId}
                aria-label={legHeading}
                className="space-y-3 border-b border-[var(--border)] pb-5 last:border-b-0"
              >
                <Heading size="sm" as="h3">
                  {legHeading}
                </Heading>
                <WmwAccountLeg leg={leg} />
              </section>
            );
          })}
        </>
      ) : (
        <WmwAccountLeg leg={view} />
      )}
    </div>
  );
}
