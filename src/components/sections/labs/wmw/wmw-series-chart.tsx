'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { niceTicks } from '@/lib/wmw/chart-scale';
import { cn } from '@/lib/utils';

export type WmwSeriesChartPoint = {
  label: string;
  value: number;
};

export type WmwSeriesChartProps = {
  points: WmwSeriesChartPoint[];
  ariaLabel: string;
  /** Axis tick labels (keep short). */
  formatValue: (value: number) => string;
  /** Hover tooltip; defaults to formatValue. */
  formatHoverValue?: (value: number) => string;
  /** Compact charts suit Account detail; default is taller Overview-style. */
  size?: 'default' | 'compact';
  className?: string;
};

const WIDTH = 640;
const HEIGHT_DEFAULT = 220;
const HEIGHT_COMPACT = 180;
const PAD_LEFT = 56;
const PAD_RIGHT = 20;
const PAD_TOP = 14;
const PAD_BOTTOM = 28;
/** User units — scales with the viewBox (CSS px would look oversized when the SVG stretches). */
const AXIS_FONT_SIZE = 8;

export function WmwSeriesChart({
  points,
  ariaLabel,
  formatValue,
  formatHoverValue,
  size = 'default',
  className,
}: WmwSeriesChartProps) {
  const hoverValue = formatHoverValue ?? formatValue;
  const prefersReducedMotion = usePrefersReducedMotion();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const height = size === 'compact' ? HEIGHT_COMPACT : HEIGHT_DEFAULT;

  if (points.length === 0) {
    return null;
  }

  const values = points.map((p) => p.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  // Pad the domain so the series is not crushed against the plot edges.
  const pad =
    dataMin === dataMax
      ? Math.abs(dataMin) * 0.08 || 1
      : (dataMax - dataMin) * 0.12;
  const min = dataMin - pad;
  const max = dataMax + pad;
  const ticks = niceTicks(min, max);
  const domainMin = Math.min(...ticks, min);
  const domainMax = Math.max(...ticks, max);
  const span = domainMax - domainMin || 1;
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;
  const plotBottom = PAD_TOP + plotHeight;

  const yFor = (value: number) =>
    PAD_TOP + (1 - (value - domainMin) / span) * plotHeight;

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? PAD_LEFT + plotWidth / 2
        : PAD_LEFT + (index / (points.length - 1)) * plotWidth;
    return { ...point, x, y: yFor(point.value), index };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    `${linePath} L ${coords[coords.length - 1]!.x.toFixed(1)} ${plotBottom.toFixed(1)}` +
    ` L ${coords[0]!.x.toFixed(1)} ${plotBottom.toFixed(1)} Z`;

  const labelStep = Math.max(1, Math.ceil(points.length / 6));
  const hovered = hoverIndex === null ? null : coords[hoverIndex];

  return (
    <figure
      className={cn('relative w-full', className)}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="block h-auto w-full text-[var(--primary)]"
        role="img"
        aria-label={ariaLabel}
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
                x={PAD_LEFT - 6}
                y={y + 2.5}
                textAnchor="end"
                className="fill-[var(--mono-500)]"
                fontSize={AXIS_FONT_SIZE}
              >
                {formatValue(tick)}
              </text>
            </g>
          );
        })}

        <line
          x1={PAD_LEFT}
          y1={PAD_TOP}
          x2={PAD_LEFT}
          y2={plotBottom}
          stroke="var(--border)"
          strokeWidth={1}
        />
        <line
          x1={PAD_LEFT}
          y1={plotBottom}
          x2={WIDTH - PAD_RIGHT}
          y2={plotBottom}
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
          <g key={`${c.label}-${c.index}`}>
            <circle
              cx={c.x}
              cy={c.y}
              r={hoverIndex === c.index ? 5 : 3.5}
              fill="var(--background)"
              stroke="currentColor"
              strokeWidth={2}
            />
            <rect
              x={c.x - Math.max(plotWidth / points.length / 2, 8)}
              y={PAD_TOP}
              width={Math.max(plotWidth / points.length, 16)}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(c.index)}
              style={{ cursor: 'crosshair' }}
            />
            {(c.index % labelStep === 0 || c.index === coords.length - 1) && (
              <text
                x={c.x}
                y={height - 8}
                textAnchor="middle"
                className="fill-[var(--mono-500)]"
                fontSize={AXIS_FONT_SIZE}
              >
                {c.label}
              </text>
            )}
          </g>
        ))}

        {hovered ? (
          <line
            x1={hovered.x}
            y1={PAD_TOP}
            x2={hovered.x}
            y2={plotBottom}
            stroke="color-mix(in oklab, var(--primary) 45%, transparent)"
            strokeWidth={1}
          />
        ) : null}
      </svg>

      {hovered ? (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 shadow-sm"
          style={{
            left: `${(hovered.x / WIDTH) * 100}%`,
            top: `${(hovered.y / height) * 100}%`,
            transform: 'translate(-50%, calc(-100% - 8px))',
          }}
          role="tooltip"
        >
          <p className="font-body text-xs text-[var(--mono-500)]">
            {hovered.label}
          </p>
          <p className="font-mono text-sm font-medium tabular-nums text-[var(--foreground)]">
            {hoverValue(hovered.value)}
          </p>
        </div>
      ) : null}
    </figure>
  );
}
