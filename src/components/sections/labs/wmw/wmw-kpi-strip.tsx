import { formatAnnualisedRate, formatGbp } from '@/lib/wmw/format';
import type { WmwOverviewKpis } from '@/lib/wmw/overview-view';
import { cn } from '@/lib/utils';

export type WmwKpiStripLabels = {
  netWorth: string;
  mom: string;
  investableAum: string;
  pairEquity: string;
};

export function WmwKpiStrip({
  kpis,
  labels,
  className,
}: {
  kpis: WmwOverviewKpis;
  labels: WmwKpiStripLabels;
  className?: string;
}) {
  const momText =
    kpis.momDelta === null
      ? '—'
      : `${formatGbp(kpis.momDelta)}${
          kpis.momPct === null ? '' : ` (${formatAnnualisedRate(kpis.momPct)})`
        }`;

  const items = [
    { label: labels.netWorth, value: formatGbp(kpis.netWorth) },
    { label: labels.mom, value: momText },
    { label: labels.investableAum, value: formatGbp(kpis.investableAum) },
    { label: labels.pairEquity, value: formatGbp(kpis.pairEquityTotal) },
  ];

  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-3 border-y border-[var(--border)] py-3 sm:grid-cols-4',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="font-body text-[0.65rem] uppercase tracking-[0.08em] text-[var(--mono-500)]">
            {item.label}
          </dt>
          <dd className="mt-0.5 font-mono text-base font-medium tabular-nums tracking-tight text-[var(--foreground)] sm:text-lg">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
