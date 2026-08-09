'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heading, Text } from '@/components/ui';
import {
  WmwDenseCell,
  WmwDenseRow,
  WmwDenseTable,
} from '@/components/sections/labs/wmw/wmw-dense-table';
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

  return (
    <div className="space-y-5">
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

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-y border-[var(--border)] py-3 sm:grid-cols-5">
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

      <section className="space-y-2">
        <Heading size="sm" as="h3">
          {copy.balanceHeading}
        </Heading>
        {view.balanceHistory.length === 0 ? (
          <Text variant="muted" className="text-sm">
            {copy.balanceEmptyLabel}
          </Text>
        ) : (
          <WmwSeriesChart
            points={view.balanceHistory.map((point) => ({
              label: formatIsoDate(point.date),
              value: point.balance,
            }))}
            ariaLabel={copy.balanceChartAriaLabel}
            formatValue={(value) => formatGbp(value, true)}
          />
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {view.unitsHistory ? (
          <section className="space-y-2">
            <Heading size="sm" as="h3">
              {copy.unitsHeading}
            </Heading>
            <WmwSeriesChart
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

      <section className="space-y-2">
        <Heading size="sm" as="h3">
          {copy.cashflowsHeading}
        </Heading>
        <WmwDenseTable
          caption={copy.cashflowsHeading}
          className="max-w-none"
          columns={[
            copy.columnDate,
            copy.columnType,
            copy.columnDescription,
            { label: copy.columnAmount, align: 'right' },
          ]}
          isEmpty={view.cashflows.length === 0}
          empty={copy.cashflowsEmptyLabel}
        >
          {view.cashflows.map((cf, index) => (
            <WmwDenseRow key={`${cf.date}-${cf.transactionType}-${index}`}>
              <WmwDenseCell mono>{formatIsoDate(cf.date)}</WmwDenseCell>
              <WmwDenseCell>{cf.transactionType}</WmwDenseCell>
              <WmwDenseCell>{cf.description || '—'}</WmwDenseCell>
              <WmwDenseCell mono align="right">
                {formatGbp(cf.amount, true)}
              </WmwDenseCell>
            </WmwDenseRow>
          ))}
        </WmwDenseTable>
      </section>

      {view.investable ? (
        <section className="space-y-2">
          <div className="space-y-0.5">
            <Heading size="sm" as="h3">
              {copy.mwrHeading}
            </Heading>
            <Text variant="muted" className="text-sm">
              {copy.mwrDescription}
            </Text>
          </div>
          <ul className="flex flex-wrap gap-2">
            {view.mwr.map((row) => (
              <li
                key={row.period}
                className="rounded-md border border-[var(--border)] px-2.5 py-1.5"
              >
                <span className="font-body text-xs text-[var(--mono-500)]">
                  {periodLabel(row.period)}
                </span>
                <span className="ml-2 font-mono text-sm tabular-nums text-[var(--foreground)]">
                  {row.status === 'available'
                    ? formatAnnualisedRate(row.annualisedRate)
                    : mwrReasonLabel(row.reason)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
