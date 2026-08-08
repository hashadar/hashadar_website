'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Heading, Text } from '@/components/ui';
import {
  JobOsLedger,
  JobOsLedgerCell,
  JobOsLedgerRow,
  JobOsWorkspaceIntro,
} from '@/components/sections/labs/job-os/job-os-ledger';
import { WmwNetWorthChart } from '@/components/sections/labs/wmw/wmw-net-worth-chart';
import { wmw } from '@/data';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import type { WmwFacade } from '@/lib/wmw/facade';
import type { MwrPeriod, MwrUnavailableReason } from '@/lib/wmw/mwr';
import {
  formatAnnualisedRate,
  formatAsOf,
  formatCalendarMonth,
  formatGbp,
} from '@/lib/wmw/format';
import {
  buildWmwOverviewView,
  type WmwOverviewView,
} from '@/lib/wmw/overview-view';
import { getDefaultWmw } from '@/lib/wmw-default';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

function accountHref(accountId: string): string {
  return `/labs/wmw/accounts/${encodeURIComponent(accountId)}`;
}

export type WmwOverviewProps = {
  /** Injectable facade for Vitest; defaults to Amplify-backed client. */
  wmwClient?: WmwFacade;
};

type LoadState = 'loading' | 'ready' | 'error';

const PERIODS: MwrPeriod[] = ['YTD', '1Y', 'Max'];

export function WmwOverview({ wmwClient }: WmwOverviewProps = {}) {
  const copy = wmw.overview;
  const prefersReducedMotion = usePrefersReducedMotion();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [view, setView] = useState<WmwOverviewView | null>(null);
  const [period, setPeriod] = useState<MwrPeriod>('YTD');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
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
        if (!snapshot) {
          setView(null);
          setLoadState('ready');
          return;
        }
        setView(buildWmwOverviewView(snapshot, period));
        setLoadState('ready');
      } catch {
        if (!cancelled) setLoadState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, period]);

  async function handleRefresh() {
    if (!client || refreshing) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const { snapshot } = await client.refresh();
      setView(buildWmwOverviewView(snapshot, period));
      setLoadState('ready');
    } catch {
      setRefreshError(copy.refreshErrorLabel);
      try {
        const lastGood = await client.getSnapshot();
        if (lastGood) {
          setView(buildWmwOverviewView(lastGood, period));
          setLoadState('ready');
        }
      } catch {
        /* keep existing view */
      }
    } finally {
      setRefreshing(false);
    }
  }

  if (loadState === 'loading' || !client) {
    return <Text variant="muted">{copy.loadingLabel}</Text>;
  }

  if (loadState === 'error') {
    return <Text variant="muted">{copy.errorLabel}</Text>;
  }

  const periodLabel = (value: MwrPeriod) => {
    if (value === 'YTD') return copy.periodYtd;
    if (value === '1Y') return copy.period1y;
    return copy.periodMax;
  };

  const mwrReasonLabel = (reason: MwrUnavailableReason) =>
    copy.mwrReasons[reason] ?? copy.mwrUnavailableLabel;

  return (
    <div className="space-y-8">
      <JobOsWorkspaceIntro
        heading={copy.heading}
        description={copy.description}
        actions={
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleRefresh();
              }}
              disabled={refreshing}
            >
              {refreshing ? copy.refreshingLabel : copy.refreshLabel}
            </Button>
            <Text variant="muted" className="text-sm tabular-nums">
              {copy.asOfLabel}:{' '}
              {view ? formatAsOf(view.asOf) : copy.asOfUnknownLabel}
            </Text>
          </div>
        }
      />

      {refreshError ? (
        <motion.div
          role="alert"
          className="rounded-lg border border-[color-mix(in_oklab,var(--primary)_28%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_6%,var(--background))] px-4 py-3"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion ? { duration: 0 } : { duration: 0.25 }
          }
        >
          <Text>{refreshError}</Text>
        </motion.div>
      ) : null}

      {!view ? (
        <div className="max-w-2xl space-y-2">
          <Heading size="md" as="h3">
            {copy.emptyHeading}
          </Heading>
          <Text variant="muted">{copy.emptyDescription}</Text>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <Heading size="md" as="h3">
              {copy.netWorthHeading}
            </Heading>
            {view.headline ? (
              <motion.div
                initial={
                  prefersReducedMotion ? false : { opacity: 0, y: 8 }
                }
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 0.35 }
                }
              >
                <Heading size="lg" as="h4" className="tabular-nums tracking-tight">
                  {formatGbp(view.headline.total)}
                </Heading>
              </motion.div>
            ) : (
              <Text variant="muted">{copy.netWorthEmptyLabel}</Text>
            )}
            {view.headline ? (
              <Text variant="muted" className="text-sm">
                {formatCalendarMonth(view.headline.month)}
              </Text>
            ) : null}
          </section>

          <section className="space-y-3">
            <Heading size="sm" as="h3">
              {copy.historyHeading}
            </Heading>
            {view.history.length === 0 ? (
              <Text variant="muted">{copy.historyEmptyLabel}</Text>
            ) : (
              <WmwNetWorthChart
                points={view.history}
                ariaLabel={copy.historyChartAriaLabel}
              />
            )}
          </section>

          <section className="space-y-3">
            <Heading size="sm" as="h3">
              {copy.classHeading}
            </Heading>
            <JobOsLedger
              caption={copy.classHeading}
              columns={[copy.columnClass, copy.columnContribution]}
              isEmpty={!view.headline || view.headline.byClass.length === 0}
              empty={copy.netWorthEmptyLabel}
            >
              {(view.headline?.byClass ?? []).map((row) => (
                <JobOsLedgerRow key={row.class}>
                  <JobOsLedgerCell>{row.class}</JobOsLedgerCell>
                  <JobOsLedgerCell mono>
                    {formatGbp(row.contribution)}
                  </JobOsLedgerCell>
                </JobOsLedgerRow>
              ))}
            </JobOsLedger>
          </section>

          <section className="space-y-3">
            <Heading size="sm" as="h3">
              {copy.accountHeading}
            </Heading>
            <JobOsLedger
              caption={copy.accountHeading}
              columns={[
                copy.columnAccount,
                copy.columnClass,
                copy.columnBalance,
                copy.columnContribution,
              ]}
              isEmpty={!view.headline || view.headline.byAccount.length === 0}
              empty={copy.netWorthEmptyLabel}
            >
              {(view.headline?.byAccount ?? []).map((row) => (
                <JobOsLedgerRow key={row.accountId}>
                  <JobOsLedgerCell>
                    <Link
                      href={accountHref(row.accountId)}
                      className="underline underline-offset-4"
                    >
                      {row.accountName}
                    </Link>
                  </JobOsLedgerCell>
                  <JobOsLedgerCell>{row.class}</JobOsLedgerCell>
                  <JobOsLedgerCell mono>
                    {formatGbp(row.balance)}
                  </JobOsLedgerCell>
                  <JobOsLedgerCell mono>
                    {formatGbp(row.contribution)}
                  </JobOsLedgerCell>
                </JobOsLedgerRow>
              ))}
            </JobOsLedger>
          </section>

          <section className="space-y-3">
            <Heading size="sm" as="h3">
              {copy.pairsHeading}
            </Heading>
            <JobOsLedger
              caption={copy.pairsHeading}
              columns={[
                copy.columnPairId,
                copy.columnAsset,
                copy.columnLiability,
                copy.columnEquity,
              ]}
              isEmpty={view.pairs.length === 0}
              empty={copy.pairsEmptyLabel}
            >
              {view.pairs.map((pair) => (
                <JobOsLedgerRow key={pair.pairId}>
                  <JobOsLedgerCell mono>{pair.pairId}</JobOsLedgerCell>
                  <JobOsLedgerCell>
                    {pair.asset?.accountName ?? '—'}
                  </JobOsLedgerCell>
                  <JobOsLedgerCell>
                    {pair.liability?.accountName ?? '—'}
                  </JobOsLedgerCell>
                  <JobOsLedgerCell mono>
                    {formatGbp(pair.equity)}
                  </JobOsLedgerCell>
                </JobOsLedgerRow>
              ))}
            </JobOsLedger>
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <Heading size="sm" as="h3">
                {copy.mwrHeading}
              </Heading>
              <Text variant="muted">{copy.mwrDescription}</Text>
            </div>

            <div
              role="group"
              aria-label={copy.periodControlAriaLabel}
              className="flex flex-wrap gap-2"
            >
              {PERIODS.map((value) => {
                const active = period === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPeriod(value)}
                    className={cn(
                      'rounded-md px-3 py-1.5 font-body text-sm transition-colors',
                      active
                        ? 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] font-medium text-[var(--primary)] ring-1 ring-[color-mix(in_oklab,var(--primary)_25%,transparent)]'
                        : 'text-[var(--mono-500)] hover:bg-[color-mix(in_oklab,var(--primary)_6%,transparent)] hover:text-[var(--foreground)]',
                    )}
                  >
                    {periodLabel(value)}
                  </button>
                );
              })}
            </div>

            <JobOsLedger
              caption={copy.mwrHeading}
              columns={[
                copy.columnAccount,
                copy.columnPeriod,
                copy.columnMwr,
              ]}
              isEmpty={view.mwr.length === 0}
              empty={copy.mwrEmptyLabel}
            >
              {view.mwr.map((row) => {
                const name =
                  view.accountNames.get(row.accountId) ?? row.accountId;
                return (
                  <JobOsLedgerRow key={`${row.accountId}-${row.period}`}>
                    <JobOsLedgerCell>
                      <Link
                        href={accountHref(row.accountId)}
                        className="underline underline-offset-4"
                      >
                        {name}
                      </Link>
                    </JobOsLedgerCell>
                    <JobOsLedgerCell>{periodLabel(row.period)}</JobOsLedgerCell>
                    <JobOsLedgerCell mono>
                      {row.status === 'available'
                        ? formatAnnualisedRate(row.annualisedRate)
                        : mwrReasonLabel(row.reason)}
                    </JobOsLedgerCell>
                  </JobOsLedgerRow>
                );
              })}
            </JobOsLedger>
          </section>

          {view.warnings.length > 0 ? (
            <section className="space-y-2">
              <Heading size="sm" as="h3">
                {copy.warningsLabel}
              </Heading>
              <ul className="list-disc space-y-1 pl-5 font-body text-sm text-[var(--mono-500)]">
                {view.warnings.map((warning, index) => (
                  <li key={`${warning.code}-${index}`}>
                    {warning.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
