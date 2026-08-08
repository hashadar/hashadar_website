'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heading, Text } from '@/components/ui';
import {
  JobOsLedger,
  JobOsLedgerCell,
  JobOsLedgerRow,
  JobOsWorkspaceIntro,
} from '@/components/sections/labs/job-os/job-os-ledger';
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
  const [client, setClient] = useState<WmwFacade | null>(wmwClient ?? null);

  useEffect(() => {
    if (wmwClient) {
      setClient(wmwClient);
      return;
    }
    let cancelled = false;
    void (async () => {
      const resolved = await getDefaultWmw();
      if (!cancelled) setClient(resolved);
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
      <div className="max-w-2xl space-y-4">
        <Heading size="md" as="h2">
          {copy.notFoundHeading}
        </Heading>
        <Text variant="muted">{copy.notFoundDescription}</Text>
        <Link
          href="/labs/wmw"
          className="inline-flex font-body text-base text-[var(--foreground)] underline underline-offset-4"
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

  const pairLabel = view.account.pairId ?? copy.pairNoneLabel;

  return (
    <div className="space-y-8">
      <JobOsWorkspaceIntro
        heading={view.account.accountName}
        description={copy.description}
        actions={
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Link
              href="/labs/wmw"
              className="inline-flex font-body text-sm text-[var(--foreground)] underline underline-offset-4"
            >
              {copy.backToOverviewLabel}
            </Link>
            <Text variant="muted" className="text-sm tabular-nums">
              {wmw.overview.asOfLabel}: {formatAsOf(view.asOf)}
            </Text>
          </div>
        }
      />

      <section className="space-y-3">
        <Heading size="sm" as="h3">
          {copy.metadataHeading}
        </Heading>
        <JobOsLedger
          caption={copy.metadataHeading}
          columns={[
            copy.columnField,
            copy.columnValue,
          ]}
          isEmpty={false}
          empty={null}
        >
          <JobOsLedgerRow>
            <JobOsLedgerCell>{copy.fieldPlatform}</JobOsLedgerCell>
            <JobOsLedgerCell>{view.account.platform}</JobOsLedgerCell>
          </JobOsLedgerRow>
          <JobOsLedgerRow>
            <JobOsLedgerCell>{copy.fieldCategory}</JobOsLedgerCell>
            <JobOsLedgerCell>
              {view.category?.categoryId ?? view.account.categoryId}
            </JobOsLedgerCell>
          </JobOsLedgerRow>
          <JobOsLedgerRow>
            <JobOsLedgerCell>{copy.fieldClass}</JobOsLedgerCell>
            <JobOsLedgerCell>
              {view.category?.class ?? copy.classUnknownLabel}
            </JobOsLedgerCell>
          </JobOsLedgerRow>
          <JobOsLedgerRow>
            <JobOsLedgerCell>{copy.fieldType}</JobOsLedgerCell>
            <JobOsLedgerCell>
              {view.category?.type ?? copy.typeUnknownLabel}
            </JobOsLedgerCell>
          </JobOsLedgerRow>
          <JobOsLedgerRow>
            <JobOsLedgerCell>{copy.fieldPair}</JobOsLedgerCell>
            <JobOsLedgerCell mono={Boolean(view.account.pairId)}>
              {pairLabel}
            </JobOsLedgerCell>
          </JobOsLedgerRow>
        </JobOsLedger>
      </section>

      <section className="space-y-3">
        <Heading size="sm" as="h3">
          {copy.balanceHeading}
        </Heading>
        {view.balanceHistory.length === 0 ? (
          <Text variant="muted">{copy.balanceEmptyLabel}</Text>
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

      <section className="space-y-3">
        <Heading size="sm" as="h3">
          {copy.cashflowsHeading}
        </Heading>
        <JobOsLedger
          caption={copy.cashflowsHeading}
          columns={[
            copy.columnDate,
            copy.columnType,
            copy.columnDescription,
            copy.columnAmount,
          ]}
          isEmpty={view.cashflows.length === 0}
          empty={copy.cashflowsEmptyLabel}
        >
          {view.cashflows.map((cf, index) => (
            <JobOsLedgerRow key={`${cf.date}-${cf.transactionType}-${index}`}>
              <JobOsLedgerCell mono>{formatIsoDate(cf.date)}</JobOsLedgerCell>
              <JobOsLedgerCell>{cf.transactionType}</JobOsLedgerCell>
              <JobOsLedgerCell>{cf.description || '—'}</JobOsLedgerCell>
              <JobOsLedgerCell mono>
                {formatGbp(cf.amount, true)}
              </JobOsLedgerCell>
            </JobOsLedgerRow>
          ))}
        </JobOsLedger>
      </section>

      {view.unitsHistory ? (
        <section className="space-y-3">
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
        <section className="space-y-3">
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

      {view.investable ? (
        <section className="space-y-3">
          <div className="space-y-1">
            <Heading size="sm" as="h3">
              {copy.mwrHeading}
            </Heading>
            <Text variant="muted">{copy.mwrDescription}</Text>
          </div>
          <JobOsLedger
            caption={copy.mwrHeading}
            columns={[
              wmw.overview.columnPeriod,
              wmw.overview.columnMwr,
            ]}
            isEmpty={view.mwr.length === 0}
            empty={wmw.overview.mwrUnavailableLabel}
          >
            {view.mwr.map((row) => (
              <JobOsLedgerRow key={row.period}>
                <JobOsLedgerCell>{periodLabel(row.period)}</JobOsLedgerCell>
                <JobOsLedgerCell mono>
                  {row.status === 'available'
                    ? formatAnnualisedRate(row.annualisedRate)
                    : mwrReasonLabel(row.reason)}
                </JobOsLedgerCell>
              </JobOsLedgerRow>
            ))}
          </JobOsLedger>
        </section>
      ) : null}
    </div>
  );
}
