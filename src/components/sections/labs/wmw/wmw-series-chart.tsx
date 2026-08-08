'use client';

import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

export type WmwSeriesChartPoint = {
  label: string;
  value: number;
};

export type WmwSeriesChartProps = {
  points: WmwSeriesChartPoint[];
  ariaLabel: string;
  formatValue: (value: number) => string;
  className?: string;
};

const WIDTH = 640;
const HEIGHT = 180;
const PAD_X = 28;
const PAD_Y = 24;

export function WmwSeriesChart({
  points,
  ariaLabel,
  formatValue,
  className,
}: WmwSeriesChartProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (points.length === 0) {
    return null;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? WIDTH / 2
        : PAD_X + (index / (points.length - 1)) * (WIDTH - PAD_X * 2);
    const y = PAD_Y + (1 - (point.value - min) / span) * (HEIGHT - PAD_Y * 2);
    return { ...point, x, y };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    `${linePath} L ${coords[coords.length - 1]!.x.toFixed(1)} ${(HEIGHT - PAD_Y).toFixed(1)}` +
    ` L ${coords[0]!.x.toFixed(1)} ${(HEIGHT - PAD_Y).toFixed(1)} Z`;

  return (
    <figure className={cn('w-full', className)} aria-label={ariaLabel}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full text-[var(--primary)]"
        role="img"
        aria-label={ariaLabel}
      >
        <line
          x1={PAD_X}
          y1={HEIGHT - PAD_Y}
          x2={WIDTH - PAD_X}
          y2={HEIGHT - PAD_Y}
          stroke="var(--border)"
          strokeWidth={1}
        />
        <motion.path
          d={areaPath}
          fill="currentColor"
          fillOpacity={0.08}
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={
            prefersReducedMotion ? { duration: 0 } : { duration: 0.5 }
          }
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={
            prefersReducedMotion ? false : { pathLength: 0, opacity: 0 }
          }
          animate={{ pathLength: 1, opacity: 1 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.7, ease: 'easeOut' }
          }
        />
        {coords.map((c) => (
          <circle
            key={`${c.label}-${c.value}`}
            cx={c.x}
            cy={c.y}
            r={3.5}
            fill="var(--background)"
            stroke="currentColor"
            strokeWidth={2}
          >
            <title>
              {c.label}: {formatValue(c.value)}
            </title>
          </circle>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-[var(--mono-500)]">
        {coords.map((c) => (
          <span key={`${c.label}-${c.value}`} className="tabular-nums">
            {c.label} {formatValue(c.value)}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
