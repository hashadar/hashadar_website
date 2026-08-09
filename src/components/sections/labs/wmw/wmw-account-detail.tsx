'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heading, Text } from '@/components/ui';
import { momDeltaClassName } from '@/components/sections/labs/wmw/wmw-dense-table';
import { WmwSeriesChart } from '@/components/sections/labs/wmw/wmw-series-chart';
import { wmw } from '@/data';
import type { WmwFacade } from '@/lib/wmw/facade';
import type { MwrUnavailableReason } from '@/lib/wmw/mwr';
import {
  formatAnnualisedRate,
  formatAsOf,
  formatGbp,
  formatIsoDate,
  formatMileage,
  formatQuantity,
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
type SeriesView = 'balance' | 'performance';

const SERIES_VIEWS: SeriesView[] = ['balance', 'performance'];

function formatSignedGbp(amount: number): string {
  const formatted = formatGbp(Math.abs(amount), true);
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `−${formatted}`;
  return formatted;
}

function formatSignedRate(rate: number): string {
  const formatted = formatAnnualisedRate(Math.abs(rate));
  if (rate > 0) return `+${formatted}`;
  if (rate < 0) return `−${formatted}`;
  return formatted;
}

export function WmwAccountDetail({
  accountId,
  wmwClient,
}: WmwAccountDetailProps) {
  const copy = wmw.accountDetail;
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [view, setView] = useState<WmwAccountDetailView | null>(null);
  const [seriesView, setSeriesView] = useState<SeriesView>('balance');
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

  const periodLabel = (value: 'YTD' | '1Y' | 'Max') => {
    if (value === 'YTD') return wmw.overview.periodYtd;
    if (value === '1Y') return wmw.overview.period1y;
    return wmw.overview.periodMax;
  };

  const mwrReasonLabel = (reason: MwrUnavailableReason) =>
    wmw.overview.mwrReasons[reason] ?? wmw.overview.mwrUnavailableLabel;

  const meta = [
    { label: copy.fieldPlatform, value: view.account.platform },
    {
      label: copy.fieldCategory,
      value: view.category?.categoryId ?? view.account.categoryId,
    },
    {
      label: copy.fieldClass,
      value: view.category?.class ?? copy.classUnknownLabel,
    },
    {
      label: copy.fieldType,
      value: view.category?.type ?? copy.typeUnknownLabel,
    },
    {
      label: copy.fieldPair,
      value: view.account.pairId ?? copy.pairNoneLabel,
      mono: Boolean(view.account.pairId),
    },
  ];

  const summary = view.cashflowSummary;
  const momClass = momDeltaClassName(view.balanceMomDelta);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-0.5">
          <Heading size="sm" as="h2">
            {view.account.accountName}
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0 space-y-4">
          <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-body text-[0.65rem] uppercase tracking-[0.08em] text-[var(--mono-500)]">
                {copy.latestBalanceLabel}
              </p>
              <p className="mt-0.5 font-mono text-2xl tabular-nums text-[var(--foreground)]">
                {view.latestBalance === null
                  ? '—'
                  : formatGbp(view.latestBalance, true)}
              </p>
              <p
                className={cn(
                  'mt-1 flex flex-wrap gap-x-3 font-mono text-sm tabular-nums',
                  momClass,
                )}
              >
                <span>
                  {view.balanceMomDelta === null
                    ? '—'
                    : formatSignedGbp(view.balanceMomDelta)}
                </span>
                <span>
                  {view.balanceMomPct === null
                    ? '—'
                    : formatSignedRate(view.balanceMomPct)}
                </span>
              </p>
            </div>

            {view.investable ? (
              <div className="sm:text-right">
                <p className="font-body text-[0.65rem] uppercase tracking-[0.08em] text-[var(--mono-500)]">
                  {copy.mwrHeading}
                </p>
                <p className="mt-1 font-mono text-sm tabular-nums text-[var(--foreground)]">
                  {view.mwr.map((row, index) => (
                    <span key={row.period}>
                      {index > 0 ? (
                        <span className="mx-1.5 text-[var(--mono-400)]">·</span>
                      ) : null}
                      <span className="text-[var(--mono-500)]">
                        {periodLabel(row.period)}{' '}
                      </span>
                      {row.status === 'available'
                        ? formatAnnualisedRate(row.annualisedRate)
                        : mwrReasonLabel(row.reason)}
                    </span>
                  ))}
                </p>
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Heading size="sm" as="h3">
                {view.investable
                  ? copy.seriesHeading
                  : copy.seriesViewBalanceLabel}
              </Heading>
              {view.investable ? (
                <div
                  role="tablist"
                  aria-label={copy.seriesViewAriaLabel}
                  className="inline-flex w-fit rounded-md border border-[var(--border)] p-0.5"
                >
                  {SERIES_VIEWS.map((mode) => {
                    const active = seriesView === mode;
                    const label =
                      mode === 'balance'
                        ? copy.seriesViewBalanceLabel
                        : copy.seriesViewPerformanceLabel;
                    return (
                      <button
                        key={mode}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setSeriesView(mode)}
                        className={cn(
                          'rounded-[5px] px-2.5 py-1 font-body text-xs transition-colors',
                          active
                            ? 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] font-medium text-[var(--primary)]'
                            : 'text-[var(--mono-500)] hover:text-[var(--foreground)]',
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {!view.investable || seriesView === 'balance' ? (
              view.balanceHistory.length === 0 ? (
                <Text variant="muted" className="text-sm">
                  {copy.seriesEmptyLabel}
                </Text>
              ) : (
                <WmwSeriesChart
                  size="compact"
                  points={view.balanceHistory.map((point) => ({
                    label: formatIsoDate(point.date),
                    value: point.balance,
                  }))}
                  ariaLabel={copy.balanceChartAriaLabel}
                  formatValue={(value) => formatGbp(value)}
                  formatHoverValue={(value) => formatGbp(value, true)}
                />
              )
            ) : view.returnHistory.length === 0 ? (
              <Text variant="muted" className="text-sm">
                {copy.seriesEmptyLabel}
              </Text>
            ) : (
              <WmwSeriesChart
                size="compact"
                points={view.returnHistory.map((point) => ({
                  label: formatIsoDate(point.date),
                  value: point.cumulativeReturn,
                }))}
                ariaLabel={copy.performanceChartAriaLabel}
                formatValue={formatAnnualisedRate}
              />
            )}
          </section>

          {view.unitsHistory ? (
            <section className="space-y-2">
              <Heading size="sm" as="h3">
                {copy.unitsHeading}
              </Heading>
              <WmwSeriesChart
                size="compact"
                points={view.unitsHistory.map((point) => ({
                  label: formatIsoDate(point.date),
                  value: point.value,
                }))}
                ariaLabel={copy.unitsChartAriaLabel}
                formatValue={formatQuantity}
              />
            </section>
          ) : null}

          {view.mileageHistory ? (
            <section className="space-y-2">
              <Heading size="sm" as="h3">
                {copy.mileageHeading}
              </Heading>
              <WmwSeriesChart
                size="compact"
                points={view.mileageHistory.map((point) => ({
                  label: formatIsoDate(point.date),
                  value: point.value,
                }))}
                ariaLabel={copy.mileageChartAriaLabel}
                formatValue={formatMileage}
              />
            </section>
          ) : null}
        </div>

        <aside className="space-y-5 border-t border-[var(--border)] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <section className="space-y-2">
            <Heading size="sm" as="h3">
              {copy.metadataHeading}
            </Heading>
            <dl className="space-y-2">
              {meta.map((item) => (
                <div key={item.label} className="min-w-0">
                  <dt className="font-body text-[0.65rem] uppercase tracking-[0.08em] text-[var(--mono-500)]">
                    {item.label}
                  </dt>
                  <dd
                    className={
                      item.mono
                        ? 'mt-0.5 truncate font-mono text-sm tabular-nums text-[var(--foreground)]'
                        : 'mt-0.5 truncate font-body text-sm text-[var(--foreground)]'
                    }
                  >
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-2">
            <Heading size="sm" as="h3">
              {copy.cashflowsHeading}
            </Heading>
            {summary.count === 0 ? (
              <Text variant="muted" className="text-sm">
                {copy.cashflowsEmptyLabel}
              </Text>
            ) : (
              <dl className="space-y-2">
                <div>
                  <dt className="font-body text-[0.65rem] uppercase tracking-[0.08em] text-[var(--mono-500)]">
                    {copy.cashflowsCountLabel}
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm tabular-nums text-[var(--foreground)]">
                    {summary.count}
                  </dd>
                </div>
                <div>
                  <dt className="font-body text-[0.65rem] uppercase tracking-[0.08em] text-[var(--mono-500)]">
                    {copy.cashflowsNetLabel}
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm tabular-nums text-[var(--foreground)]">
                    {formatGbp(summary.netAmount, true)}
                  </dd>
                </div>
                <div>
                  <dt className="font-body text-[0.65rem] uppercase tracking-[0.08em] text-[var(--mono-500)]">
                    {copy.cashflowsContributionsLabel}
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm tabular-nums text-[var(--foreground)]">
                    {formatGbp(summary.contributionTotal, true)}
                  </dd>
                </div>
                <div>
                  <dt className="font-body text-[0.65rem] uppercase tracking-[0.08em] text-[var(--mono-500)]">
                    {copy.cashflowsWithdrawalsLabel}
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm tabular-nums text-[var(--foreground)]">
                    {formatGbp(summary.withdrawalTotal, true)}
                  </dd>
                </div>
                <div>
                  <dt className="font-body text-[0.65rem] uppercase tracking-[0.08em] text-[var(--mono-500)]">
                    {copy.cashflowsLastLabel}
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm tabular-nums text-[var(--foreground)]">
                    {summary.lastDate ? formatIsoDate(summary.lastDate) : '—'}
                  </dd>
                </div>
              </dl>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
