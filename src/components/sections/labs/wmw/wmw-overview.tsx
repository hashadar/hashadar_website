'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button, Heading, Text } from '@/components/ui';
import { WmwClassMixChart } from '@/components/sections/labs/wmw/wmw-class-mix-chart';
import {
  WmwDenseCell,
  WmwDenseRow,
  WmwDenseTable,
} from '@/components/sections/labs/wmw/wmw-dense-table';
import { WmwKpiStrip } from '@/components/sections/labs/wmw/wmw-kpi-strip';
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
import type { CalendarMonth } from '@/lib/wmw/types';
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

function formatPctOfNw(value: number | null): string {
  if (value === null) return '—';
  return formatAnnualisedRate(value);
}

export function WmwOverview({ wmwClient }: WmwOverviewProps = {}) {
  const copy = wmw.overview;
  const prefersReducedMotion = usePrefersReducedMotion();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [view, setView] = useState<WmwOverviewView | null>(null);
  const [period, setPeriod] = useState<MwrPeriod>('YTD');
  const [selectedMonth, setSelectedMonth] = useState<CalendarMonth | null>(
    null,
  );
  const [accountQuery, setAccountQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
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
        if (!snapshot) {
          setView(null);
          setLoadState('ready');
          return;
        }
        const next = buildWmwOverviewView(snapshot, {
          period,
          selectedMonth,
          accountQuery,
        });
        setView(next);
        if (!selectedMonth && next.selectedMonth) {
          setSelectedMonth(next.selectedMonth);
        }
        setLoadState('ready');
      } catch {
        if (!cancelled) setLoadState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, period, selectedMonth, accountQuery]);

  async function handleRefresh() {
    if (!client || refreshing) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const { snapshot } = await client.refresh();
      const next = buildWmwOverviewView(snapshot, {
        period,
        selectedMonth,
        accountQuery,
      });
      setView(next);
      if (next.selectedMonth) setSelectedMonth(next.selectedMonth);
      setLoadState('ready');
    } catch {
      setRefreshError(copy.refreshErrorLabel);
      try {
        const lastGood = await client.getSnapshot();
        if (lastGood) {
          setView(
            buildWmwOverviewView(lastGood, {
              period,
              selectedMonth,
              accountQuery,
            }),
          );
          setLoadState('ready');
        }
      } catch {
        /* keep existing view */
      }
    } finally {
      setRefreshing(false);
    }
  }

  const periodLabel = (value: MwrPeriod) => {
    if (value === 'YTD') return copy.periodYtd;
    if (value === '1Y') return copy.period1y;
    return copy.periodMax;
  };

  const mwrReasonLabel = (reason: MwrUnavailableReason) =>
    copy.mwrReasons[reason] ?? copy.mwrUnavailableLabel;

  const monthOptions = useMemo(() => view?.months ?? [], [view?.months]);

  if (loadState === 'loading' || !client) {
    return <Text variant="muted">{copy.loadingLabel}</Text>;
  }

  if (loadState === 'error') {
    return <Text variant="muted">{copy.errorLabel}</Text>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-0.5">
          <Heading size="sm" as="h2">
            {copy.heading}
          </Heading>
          <Text variant="muted" className="text-sm">
            {copy.asOfLabel}:{' '}
            <span className="tabular-nums">
              {view ? formatAsOf(view.asOf) : copy.asOfUnknownLabel}
            </span>
          </Text>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {view && monthOptions.length > 0 ? (
            <label className="flex flex-col gap-0.5 font-body text-xs text-[var(--mono-500)]">
              {copy.monthSlicerLabel}
              <select
                className="min-w-[8.5rem] rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--foreground)]"
                value={selectedMonth ?? view.selectedMonth ?? ''}
                onChange={(event) => {
                  setSelectedMonth(event.target.value as CalendarMonth);
                }}
              >
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {formatCalendarMonth(month)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div
            role="group"
            aria-label={copy.periodControlAriaLabel}
            className="flex flex-wrap gap-1"
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
                    'rounded-md px-2.5 py-1.5 font-body text-xs transition-colors',
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
          <Button
            type="button"
            variant="outline"
            className="!px-3 !py-1.5 !text-sm"
            onClick={() => {
              void handleRefresh();
            }}
            disabled={refreshing}
          >
            {refreshing ? copy.refreshingLabel : copy.refreshLabel}
          </Button>
        </div>
      </div>

      {refreshError ? (
        <motion.div
          role="alert"
          className="rounded-md border border-[color-mix(in_oklab,var(--primary)_28%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_6%,var(--background))] px-3 py-2"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }
          }
        >
          <Text className="text-sm">{refreshError}</Text>
        </motion.div>
      ) : null}

      {!view ? (
        <div className="max-w-xl space-y-1">
          <Heading size="sm" as="h3">
            {copy.emptyHeading}
          </Heading>
          <Text variant="muted" className="text-sm">
            {copy.emptyDescription}
          </Text>
        </div>
      ) : (
        <>
          {view.kpis ? (
            <WmwKpiStrip
              kpis={view.kpis}
              labels={{
                netWorth: copy.netWorthHeading,
                mom: copy.kpiMomLabel,
                brokerageAum: copy.kpiBrokerageLabel,
                cash: copy.kpiCashLabel,
              }}
            />
          ) : (
            <Text variant="muted" className="text-sm">
              {copy.netWorthEmptyLabel}
            </Text>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-2">
              <Heading size="sm" as="h3">
                {copy.historyHeading}
              </Heading>
              {view.history.length === 0 ? (
                <Text variant="muted" className="text-sm">
                  {copy.historyEmptyLabel}
                </Text>
              ) : (
                <WmwNetWorthChart
                  points={view.history}
                  ariaLabel={copy.historyChartAriaLabel}
                />
              )}
            </section>
            <section className="space-y-2">
              <Heading size="sm" as="h3">
                {copy.classMixHeading}
              </Heading>
              {view.classHistory.length === 0 ? (
                <Text variant="muted" className="text-sm">
                  {copy.historyEmptyLabel}
                </Text>
              ) : (
                <WmwClassMixChart
                  points={view.classHistory}
                  ariaLabel={copy.classMixChartAriaLabel}
                />
              )}
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-2">
              <Heading size="sm" as="h3">
                {copy.classHeading}
              </Heading>
              <WmwDenseTable
                caption={copy.classHeading}
                columns={[
                  copy.columnClass,
                  copy.columnContribution,
                  copy.columnPct,
                  copy.columnMom,
                ]}
                isEmpty={view.classRows.length === 0}
                empty={copy.netWorthEmptyLabel}
              >
                {view.classRows.map((row) => (
                  <WmwDenseRow key={row.class}>
                    <WmwDenseCell>{row.class}</WmwDenseCell>
                    <WmwDenseCell mono align="right">
                      {formatGbp(row.contribution)}
                    </WmwDenseCell>
                    <WmwDenseCell mono align="right">
                      {formatPctOfNw(row.pctOfNetWorth)}
                    </WmwDenseCell>
                    <WmwDenseCell mono align="right">
                      {row.momDelta === null ? '—' : formatGbp(row.momDelta)}
                    </WmwDenseCell>
                  </WmwDenseRow>
                ))}
              </WmwDenseTable>
            </section>

            <section className="space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <Heading size="sm" as="h3">
                  {copy.accountHeading}
                </Heading>
                <label className="flex min-w-[12rem] flex-col gap-0.5 font-body text-xs text-[var(--mono-500)]">
                  {copy.accountSearchLabel}
                  <input
                    type="search"
                    value={accountQuery}
                    onChange={(event) => setAccountQuery(event.target.value)}
                    placeholder={copy.accountSearchPlaceholder}
                    className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--foreground)]"
                  />
                </label>
              </div>
              <WmwDenseTable
                caption={copy.accountHeading}
                className="max-w-none"
                columns={[
                  copy.columnAccount,
                  copy.columnClass,
                  copy.columnBalance,
                  copy.columnContribution,
                  copy.columnPct,
                  copy.columnMom,
                ]}
                isEmpty={view.accountRows.length === 0}
                empty={copy.netWorthEmptyLabel}
              >
                {view.accountRows.map((row) => (
                  <WmwDenseRow key={row.accountId}>
                    <WmwDenseCell>
                      <Link
                        href={accountHref(row.accountId)}
                        className="underline underline-offset-2"
                      >
                        {row.accountName}
                      </Link>
                    </WmwDenseCell>
                    <WmwDenseCell>{row.class}</WmwDenseCell>
                    <WmwDenseCell mono align="right">
                      {formatGbp(row.balance)}
                    </WmwDenseCell>
                    <WmwDenseCell mono align="right">
                      {formatGbp(row.contribution)}
                    </WmwDenseCell>
                    <WmwDenseCell mono align="right">
                      {formatPctOfNw(row.pctOfNetWorth)}
                    </WmwDenseCell>
                    <WmwDenseCell mono align="right">
                      {row.momDelta === null ? '—' : formatGbp(row.momDelta)}
                    </WmwDenseCell>
                  </WmwDenseRow>
                ))}
              </WmwDenseTable>
            </section>
          </div>

          <section id="pairs" className="space-y-2 scroll-mt-24">
            <Heading size="sm" as="h3">
              {copy.pairsHeading}
            </Heading>
            <WmwDenseTable
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
                <WmwDenseRow key={pair.pairId}>
                  <WmwDenseCell mono>{pair.pairId}</WmwDenseCell>
                  <WmwDenseCell>
                    {pair.asset?.accountName ?? '—'}
                  </WmwDenseCell>
                  <WmwDenseCell>
                    {pair.liability?.accountName ?? '—'}
                  </WmwDenseCell>
                  <WmwDenseCell mono align="right">
                    {formatGbp(pair.equity)}
                  </WmwDenseCell>
                </WmwDenseRow>
              ))}
            </WmwDenseTable>
          </section>

          <section className="space-y-2">
            <div className="space-y-0.5">
              <Heading size="sm" as="h3">
                {copy.mwrHeading}
              </Heading>
              <Text variant="muted" className="text-sm">
                {copy.mwrDescription}
              </Text>
            </div>
            {view.mwr.length === 0 ? (
              <Text variant="muted" className="text-sm">
                {copy.mwrEmptyLabel}
              </Text>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {view.mwr.map((row) => {
                  const name =
                    view.accountNames.get(row.accountId) ?? row.accountId;
                  const value =
                    row.status === 'available'
                      ? formatAnnualisedRate(row.annualisedRate)
                      : mwrReasonLabel(row.reason);
                  return (
                    <li
                      key={`${row.accountId}-${row.period}`}
                      className="rounded-md border border-[var(--border)] px-2.5 py-1.5"
                    >
                      <Link
                        href={accountHref(row.accountId)}
                        className="font-body text-sm underline underline-offset-2"
                      >
                        {name}
                      </Link>
                      <span className="ml-2 font-mono text-sm tabular-nums text-[var(--foreground)]">
                        {value}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {view.warnings.length > 0 ? (
            <section className="space-y-1">
              <Heading size="sm" as="h3">
                {copy.warningsLabel}
              </Heading>
              <ul className="list-disc space-y-0.5 pl-5 font-body text-xs text-[var(--mono-500)]">
                {view.warnings.map((warning, index) => (
                  <li key={`${warning.code}-${index}`}>{warning.message}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
