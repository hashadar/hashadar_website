import { formatAnnualisedRate, formatGbp } from '@/lib/wmw/format';
import type { WmwKpiMetric, WmwOverviewKpis } from '@/lib/wmw/overview-view';
import { cn } from '@/lib/utils';

export type WmwKpiStripLabels = {
  netWorth: string;
  cashSavings: string;
  generalInvestments: string;
  retirement: string;
};

function formatSignedGbp(amount: number): string {
  const formatted = formatGbp(Math.abs(amount));
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

function MomLine({ metric }: { metric: WmwKpiMetric }) {
  if (metric.momDelta === null) {
    return (
      <p className="mt-1 font-mono text-sm tabular-nums text-[var(--mono-500)]">
        —
      </p>
    );
  }

  const up = metric.momDelta > 0;
  const flat = metric.momDelta === 0;
  const colour = flat
    ? 'text-[var(--mono-500)]'
    : up
      ? 'text-[color-mix(in_oklab,#15803d_85%,var(--foreground))]'
      : 'text-[color-mix(in_oklab,#b91c1c_85%,var(--foreground))]';

  return (
    <p
      className={cn(
        'mt-1 flex flex-wrap gap-x-2.5 font-mono text-sm tabular-nums sm:text-[0.95rem]',
        colour,
      )}
    >
      <span>{formatSignedGbp(metric.momDelta)}</span>
      <span>
        {metric.momPct === null ? '—' : formatSignedRate(metric.momPct)}
      </span>
      <span className="sr-only">
        {flat ? 'unchanged' : up ? 'up' : 'down'} versus prior month
      </span>
    </p>
  );
}

function KpiCell({
  label,
  metric,
}: {
  label: string;
  metric: WmwKpiMetric;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-body text-xs font-medium tracking-[0.04em] text-[var(--mono-500)] sm:text-sm">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-xl font-medium tabular-nums tracking-tight text-[var(--foreground)] sm:text-2xl">
        {formatGbp(metric.total)}
      </dd>
      <MomLine metric={metric} />
    </div>
  );
}

export function WmwKpiStrip({
  kpis,
  labels,
  className,
}: {
  kpis: WmwOverviewKpis;
  labels: WmwKpiStripLabels;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-x-5 gap-y-4 border-y border-[var(--border)] py-4 sm:grid-cols-4',
        className,
      )}
    >
      <KpiCell label={labels.netWorth} metric={kpis.netWorth} />
      <KpiCell label={labels.cashSavings} metric={kpis.cashSavings} />
      <KpiCell
        label={labels.generalInvestments}
        metric={kpis.generalInvestments}
      />
      <KpiCell label={labels.retirement} metric={kpis.retirement} />
    </dl>
  );
}
