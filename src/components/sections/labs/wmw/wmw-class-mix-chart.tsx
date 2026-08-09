'use client';

import { formatCalendarMonth } from '@/lib/wmw/format';
import type { WmwClassHistoryPoint } from '@/lib/wmw/overview-view';
import { cn } from '@/lib/utils';

export type WmwClassMixChartProps = {
  points: WmwClassHistoryPoint[];
  ariaLabel: string;
  className?: string;
};

const WIDTH = 640;
const HEIGHT = 180;
const PAD_X = 28;
const PAD_Y = 20;

/** Distinct strokes from theme-ish neutrals (no purple cluster). */
const CLASS_FILLS = [
  'color-mix(in oklab, var(--foreground) 72%, transparent)',
  'color-mix(in oklab, var(--primary) 55%, transparent)',
  'color-mix(in oklab, var(--mono-500) 55%, transparent)',
  'color-mix(in oklab, var(--foreground) 40%, transparent)',
  'color-mix(in oklab, var(--primary) 30%, transparent)',
  'color-mix(in oklab, var(--mono-500) 35%, transparent)',
];

export function WmwClassMixChart({
  points,
  ariaLabel,
  className,
}: WmwClassMixChartProps) {
  if (points.length === 0) return null;

  const classNames = [
    ...new Set(points.flatMap((p) => p.byClass.map((row) => row.class))),
  ].sort();

  const positives = points.map((point) =>
    point.byClass.reduce(
      (sum, row) => sum + Math.max(0, row.contribution),
      0,
    ),
  );
  const max = Math.max(...positives, 1);
  const slot = (WIDTH - PAD_X * 2) / Math.max(points.length, 1);
  const barWidth = Math.min(36, slot * 0.62);

  return (
    <figure className={cn('w-full', className)} aria-label={ariaLabel}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
      >
        {points.map((point, index) => {
          const xCentre = PAD_X + slot * index + slot / 2;
          let y = HEIGHT - PAD_Y;
          const positiveRows = point.byClass
            .filter((row) => row.contribution > 0)
            .sort((a, b) => b.contribution - a.contribution);

          return (
            <g key={point.month}>
              {positiveRows.map((row) => {
                const h =
                  (row.contribution / max) * (HEIGHT - PAD_Y * 2);
                y -= h;
                const fillIndex = classNames.indexOf(row.class);
                return (
                  <rect
                    key={row.class}
                    x={xCentre - barWidth / 2}
                    y={y}
                    width={barWidth}
                    height={Math.max(h, 0)}
                    fill={CLASS_FILLS[fillIndex % CLASS_FILLS.length]}
                  >
                    <title>
                      {`${formatCalendarMonth(point.month)} · ${row.class}`}
                    </title>
                  </rect>
                );
              })}
              <text
                x={xCentre}
                y={HEIGHT - 4}
                textAnchor="middle"
                className="fill-[var(--mono-500)]"
                style={{ fontSize: 9 }}
              >
                {formatCalendarMonth(point.month)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
