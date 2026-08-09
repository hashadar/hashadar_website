'use client';

import { useState } from 'react';
import { formatCalendarMonth, formatGbp } from '@/lib/wmw/format';
import type { WmwClassHistoryPoint } from '@/lib/wmw/overview-view';
import { cn } from '@/lib/utils';

export type WmwClassMixChartProps = {
  points: WmwClassHistoryPoint[];
  ariaLabel: string;
  className?: string;
};

const WIDTH = 640;
const HEIGHT = 240;
const PAD_LEFT = 72;
const PAD_RIGHT = 28;
const PAD_TOP = 16;
const PAD_BOTTOM = 48;

const CLASS_FILLS = [
  'color-mix(in oklab, var(--foreground) 72%, transparent)',
  'color-mix(in oklab, var(--primary) 55%, transparent)',
  'color-mix(in oklab, var(--mono-500) 55%, transparent)',
  'color-mix(in oklab, var(--foreground) 40%, transparent)',
  'color-mix(in oklab, var(--primary) 30%, transparent)',
  'color-mix(in oklab, var(--mono-500) 35%, transparent)',
];

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.abs(min) || 1;
    return [min - pad, 0, min + pad];
  }
  const span = max - min;
  const step = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(Math.abs(step) || 1));
  const niceStep = Math.ceil(step / magnitude) * magnitude;
  const niceMin = Math.floor(min / niceStep) * niceStep;
  const ticks: number[] = [];
  for (let value = niceMin; value <= max + niceStep * 0.01; value += niceStep) {
    ticks.push(value);
  }
  if (!ticks.includes(0) && min < 0 && max > 0) {
    ticks.push(0);
    ticks.sort((a, b) => a - b);
  }
  return ticks.length ? ticks : [min, 0, max];
}

export function WmwClassMixChart({
  points,
  ariaLabel,
  className,
}: WmwClassMixChartProps) {
  const [hover, setHover] = useState<{
    month: string;
    className: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  if (points.length === 0) return null;

  const classNames = [
    ...new Set(points.flatMap((p) => p.byClass.map((row) => row.class))),
  ].sort();

  const stackExtents = points.map((point) => {
    let positive = 0;
    let negative = 0;
    for (const row of point.byClass) {
      if (row.contribution >= 0) positive += row.contribution;
      else negative += row.contribution;
    }
    return { positive, negative };
  });
  const maxPositive = Math.max(...stackExtents.map((e) => e.positive), 0);
  const minNegative = Math.min(...stackExtents.map((e) => e.negative), 0);
  const ticks = niceTicks(minNegative, maxPositive);
  const domainMin = Math.min(...ticks, minNegative);
  const domainMax = Math.max(...ticks, maxPositive);
  const span = domainMax - domainMin || 1;
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const yFor = (value: number) =>
    PAD_TOP + (1 - (value - domainMin) / span) * plotHeight;
  const zeroY = yFor(0);

  const slot = plotWidth / Math.max(points.length, 1);
  const barWidth = Math.min(28, slot * 0.55);
  const labelStep = Math.max(1, Math.ceil(points.length / 6));

  return (
    <figure
      className={cn('relative w-full', className)}
      aria-label={ariaLabel}
      onMouseLeave={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
      >
        {ticks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                y1={y}
                x2={WIDTH - PAD_RIGHT}
                y2={y}
                stroke="var(--border)"
                strokeWidth={1}
                strokeDasharray={tick === 0 ? undefined : '3 3'}
              />
              <text
                x={PAD_LEFT - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-[var(--mono-500)]"
                style={{ fontSize: 10 }}
              >
                {formatGbp(tick)}
              </text>
            </g>
          );
        })}

        <line
          x1={PAD_LEFT}
          y1={PAD_TOP}
          x2={PAD_LEFT}
          y2={HEIGHT - PAD_BOTTOM}
          stroke="var(--border)"
          strokeWidth={1}
        />
        <line
          x1={PAD_LEFT}
          y1={zeroY}
          x2={WIDTH - PAD_RIGHT}
          y2={zeroY}
          stroke="var(--foreground)"
          strokeOpacity={0.35}
          strokeWidth={1}
        />

        {points.map((point, index) => {
          const xCentre = PAD_LEFT + slot * index + slot / 2;
          const positiveRows = point.byClass
            .filter((row) => row.contribution > 0)
            .sort((a, b) => b.contribution - a.contribution);
          const negativeRows = point.byClass
            .filter((row) => row.contribution < 0)
            .sort((a, b) => a.contribution - b.contribution);

          let yPos = zeroY;
          let yNeg = zeroY;

          return (
            <g key={point.month}>
              {positiveRows.map((row) => {
                const h = (row.contribution / span) * plotHeight;
                yPos -= h;
                const fillIndex = classNames.indexOf(row.class);
                return (
                  <rect
                    key={`p-${row.class}`}
                    x={xCentre - barWidth / 2}
                    y={yPos}
                    width={barWidth}
                    height={Math.max(h, 0)}
                    fill={CLASS_FILLS[fillIndex % CLASS_FILLS.length]}
                    onMouseEnter={() =>
                      setHover({
                        month: point.month,
                        className: row.class,
                        value: row.contribution,
                        x: xCentre,
                        y: yPos,
                      })
                    }
                    style={{ cursor: 'crosshair' }}
                  />
                );
              })}
              {negativeRows.map((row) => {
                const h = (Math.abs(row.contribution) / span) * plotHeight;
                const y = yNeg;
                yNeg += h;
                const fillIndex = classNames.indexOf(row.class);
                return (
                  <rect
                    key={`n-${row.class}`}
                    x={xCentre - barWidth / 2}
                    y={y}
                    width={barWidth}
                    height={Math.max(h, 0)}
                    fill={CLASS_FILLS[fillIndex % CLASS_FILLS.length]}
                    fillOpacity={0.85}
                    onMouseEnter={() =>
                      setHover({
                        month: point.month,
                        className: row.class,
                        value: row.contribution,
                        x: xCentre,
                        y,
                      })
                    }
                    style={{ cursor: 'crosshair' }}
                  />
                );
              })}
              {(index % labelStep === 0 || index === points.length - 1) && (
                <text
                  x={xCentre}
                  y={HEIGHT - 14}
                  textAnchor="middle"
                  className="fill-[var(--mono-500)]"
                  style={{ fontSize: 10 }}
                >
                  {formatCalendarMonth(point.month)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {classNames.map((name, index) => (
          <li
            key={name}
            className="inline-flex items-center gap-1.5 font-body text-xs text-[var(--mono-500)]"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{
                background: CLASS_FILLS[index % CLASS_FILLS.length],
              }}
              aria-hidden
            />
            {name}
          </li>
        ))}
      </ul>

      {hover ? (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 shadow-sm"
          style={{
            left: `${(hover.x / WIDTH) * 100}%`,
            top: `${(hover.y / HEIGHT) * 100}%`,
            transform: 'translate(-50%, calc(-100% - 8px))',
          }}
          role="tooltip"
        >
          <p className="font-body text-xs text-[var(--mono-500)]">
            {formatCalendarMonth(hover.month)} · {hover.className}
          </p>
          <p className="font-mono text-sm font-medium tabular-nums text-[var(--foreground)]">
            {formatGbp(hover.value)}
          </p>
        </div>
      ) : null}
    </figure>
  );
}
