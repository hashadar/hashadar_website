import { formatAnnualisedRate, formatGbp } from '@/lib/wmw/format';
import type { WmwOverviewKpis } from '@/lib/wmw/overview-view';
import { cn } from '@/lib/utils';

export type WmwKpiStripLabels = {
  netWorth: string;
  mom: string;
  brokerageAum: string;
  cash: string;
};

function MomMovement({
  delta,
  pct,
}: {
  delta: number | null;
  pct: number | null;
}) {
  if (delta === null) {
    return (
      <span className="font-mono text-sm tabular-nums text-[var(--mono-500)]">
        —
      </span>
    );
  }

  const up = delta > 0;
  const flat = delta === 0;
  const colour = flat
    ? 'text-[var(--mono-500)]'
    : up
      ? 'text-[color-mix(in_oklab,#15803d_85%,var(--foreground))]'
      : 'text-[color-mix(in_oklab,#b91c1c_85%,var(--foreground))]';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono text-sm font-medium tabular-nums',
        colour,
      )}
    >
      <span aria-hidden className="text-base leading-none">
        {flat ? '→' : up ? '↑' : '↓'}
      </span>
      <span>
        {formatGbp(delta)}
        {pct === null ? '' : ` (${formatAnnualisedRate(pct)})`}
      </span>
      <span className="sr-only">
        {flat ? 'unchanged' : up ? 'up' : 'down'} versus prior month
      </span>
    </span>
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
        'grid grid-cols-2 gap-x-4 gap-y-3 border-y border-[var(--border)] py-3 sm:grid-cols-4',
        className,
      )}
    >
      <div className="min-w-0">
        <dt className="font-body text-[0.65rem] uppercase tracking-[0.08em] text-[var(--mono-500)]">
          {labels.netWorth}
        </dt>
        <dd className="mt-0.5 font-mono text-base font-medium tabular-nums tracking-tight text-[var(--foreground)] sm:text-lg">
          {formatGbp(kpis.netWorth)}
        </dd>
      </div>

      <div className="min-w-0">
        <dt className="font-body text-[0.65rem] uppercase tracking-[0.08em] text-[var(--mono-500)]">
          {labels.mom}
        </dt>
        <dd className="mt-0.5">
          <MomMovement delta={kpis.momDelta} pct={kpis.momPct} />
        </dd>
      </div>

      <div className="min-w-0">
        <dt className="font-body text-[0.65rem] uppercase tracking-[0.08em] text-[var(--mono-500)]">
          {labels.brokerageAum}
        </dt>
        <dd className="mt-0.5 font-mono text-base font-medium tabular-nums tracking-tight text-[var(--foreground)] sm:text-lg">
          {formatGbp(kpis.brokerageAum)}
        </dd>
      </div>

      <div className="min-w-0">
        <dt className="font-body text-[0.65rem] uppercase tracking-[0.08em] text-[var(--mono-500)]">
          {labels.cash}
        </dt>
        <dd className="mt-0.5 font-mono text-base font-medium tabular-nums tracking-tight text-[var(--foreground)] sm:text-lg">
          {formatGbp(kpis.cashTotal)}
        </dd>
      </div>
    </dl>
  );
}
