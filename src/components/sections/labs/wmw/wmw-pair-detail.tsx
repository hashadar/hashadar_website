import { Heading, Text } from '@/components/ui';
import {
  formatSignedGbp,
  formatSignedRate,
  WmwAccountDetailHeader,
  WmwAccountMetadata,
  WmwCashflowSummary,
} from '@/components/sections/labs/wmw/wmw-account-detail-parts';
import { momDeltaClassName } from '@/components/sections/labs/wmw/wmw-dense-table';
import { WmwPairSubline } from '@/components/sections/labs/wmw/wmw-pair-subline';
import { WmwSeriesChart } from '@/components/sections/labs/wmw/wmw-series-chart';
import { wmw } from '@/data';
import type {
  WmwAccountDetailView,
  WmwPairDetail as WmwPairDetailModel,
  WmwPairLegDetail,
} from '@/lib/wmw/account-detail-view';
import {
  formatCalendarMonth,
  formatGbp,
  formatIsoDate,
  formatMileage,
  formatQuantity,
} from '@/lib/wmw/format';
import { cn } from '@/lib/utils';

type ReadyView = Extract<WmwAccountDetailView, { status: 'ready' }>;

export type WmwPairDetailProps = {
  view: ReadyView;
  pair: WmwPairDetailModel;
};

function LegSeries({ leg }: { leg: WmwPairLegDetail }) {
  const copy = wmw.accountDetail;
  const name = leg.account.accountName;
  const roleLabel =
    leg.role === 'asset' ? copy.legAssetLabel : copy.legLiabilityLabel;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Heading size="sm" as="h3">
          {name}
        </Heading>
        <p className="font-body text-xs text-[var(--mono-500)]">
          {roleLabel}
          <span className="ml-2 font-mono tabular-nums text-[var(--foreground)]">
            {leg.latestBalance === null
              ? '—'
              : formatGbp(leg.latestBalance, true)}
          </span>
        </p>
      </div>

      {leg.balanceHistory.length === 0 ? (
        <Text variant="muted" className="text-sm">
          {copy.seriesEmptyLabel}
        </Text>
      ) : (
        <WmwSeriesChart
          size="compact"
          points={leg.balanceHistory.map((point) => ({
            label: formatIsoDate(point.date),
            value: point.balance,
          }))}
          ariaLabel={`${copy.balanceChartAriaLabel}: ${name}`}
          formatValue={(value) => formatGbp(value)}
          formatHoverValue={(value) => formatGbp(value, true)}
        />
      )}

      {leg.unitsHistory ? (
        <div className="space-y-2">
          <Heading size="sm" as="h4">
            {copy.unitsHeading}
          </Heading>
          <WmwSeriesChart
            size="compact"
            points={leg.unitsHistory.map((point) => ({
              label: formatIsoDate(point.date),
              value: point.value,
            }))}
            ariaLabel={`${copy.unitsChartAriaLabel}: ${name}`}
            formatValue={formatQuantity}
          />
        </div>
      ) : null}

      {leg.mileageHistory ? (
        <div className="space-y-2">
          <Heading size="sm" as="h4">
            {copy.mileageHeading}
          </Heading>
          <WmwSeriesChart
            size="compact"
            points={leg.mileageHistory.map((point) => ({
              label: formatIsoDate(point.date),
              value: point.value,
            }))}
            ariaLabel={`${copy.mileageChartAriaLabel}: ${name}`}
            formatValue={formatMileage}
          />
        </div>
      ) : null}
    </section>
  );
}

/** Combined detail for Paired Accounts, keyed on the asset Account. */
export function WmwPairDetail({ view, pair }: WmwPairDetailProps) {
  const copy = wmw.accountDetail;

  return (
    <div className="space-y-4">
      <WmwAccountDetailHeader name={view.account.accountName} asOf={view.asOf} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0 space-y-4">
          <section className="space-y-1">
            <p className="font-body text-[0.65rem] uppercase tracking-[0.08em] text-[var(--mono-500)]">
              {copy.pairEquityLabel}
            </p>
            <p className="font-mono text-2xl tabular-nums text-[var(--foreground)]">
              {pair.equity === null ? '—' : formatGbp(pair.equity, true)}
            </p>
            <p
              className={cn(
                'flex flex-wrap gap-x-3 font-mono text-sm tabular-nums',
                momDeltaClassName(pair.equityMomDelta),
              )}
            >
              <span>
                {pair.equityMomDelta === null
                  ? '—'
                  : formatSignedGbp(pair.equityMomDelta)}
              </span>
              <span>
                {pair.equityMomPct === null
                  ? '—'
                  : formatSignedRate(pair.equityMomPct)}
              </span>
            </p>
            {pair.equity === null ? null : (
              <WmwPairSubline
                assetTotal={pair.assetTotal}
                liabilityTotal={pair.liabilityTotal}
              />
            )}
          </section>

          <section className="space-y-2">
            <Heading size="sm" as="h3">
              {copy.pairEquityHistoryHeading}
            </Heading>
            {pair.equityHistory.length === 0 ? (
              <Text variant="muted" className="text-sm">
                {copy.seriesEmptyLabel}
              </Text>
            ) : (
              <WmwSeriesChart
                size="compact"
                points={pair.equityHistory.map((point) => ({
                  label: formatCalendarMonth(point.month),
                  value: point.value,
                }))}
                ariaLabel={copy.pairEquityChartAriaLabel}
                formatValue={(value) => formatGbp(value)}
                formatHoverValue={(value) => formatGbp(value, true)}
              />
            )}
          </section>

          {pair.legs.map((leg) => (
            <LegSeries key={leg.account.accountId} leg={leg} />
          ))}
        </div>

        <aside className="space-y-5 border-t border-[var(--border)] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          {pair.legs.map((leg) => (
            <div key={leg.account.accountId} className="space-y-4">
              <section className="space-y-2">
                <Heading size="sm" as="h3">
                  {leg.account.accountName}
                </Heading>
                <WmwAccountMetadata
                  account={leg.account}
                  category={leg.category}
                />
              </section>
              <section className="space-y-2">
                <Heading size="sm" as="h4">
                  {copy.cashflowsHeading}
                </Heading>
                <WmwCashflowSummary summary={leg.cashflowSummary} />
              </section>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
