'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Heading, Text } from '@/components/ui';
import { useCfa } from '@/components/sections/labs/cfa/cfa-context';
import { CfaPageHeader, CfaReady } from '@/components/sections/labs/cfa/cfa-page-state';
import {
  cfaCardClassName,
  cfaLinkClassName,
  cfaMutedClassName,
  cfaPrimaryButtonClassName,
  cfaSecondaryButtonClassName,
} from '@/components/sections/labs/cfa/cfa-ui';
import { cfa } from '@/data';
import { fill } from '@/lib/cfa/format';
import { lastCaptureSession } from '@/lib/cfa/sets';
import {
  answeredSummary,
  daysToExam,
  dueCount,
  formatPercent,
  indexQuestions,
  moduleRows,
  weakestLos,
  WEAKEST_LOS_MIN_ATTEMPTS,
} from '@/lib/cfa/stats';
import { moduleName, readingName } from '@/lib/cfa/syllabus';
import { cn } from '@/lib/utils';

export type CfaOverviewProps = {
  /** Injectable clock for Vitest. */
  now?: Date;
};

function Kpi({ value, label, children }: { value: string; label: string; children?: React.ReactNode }) {
  return (
    <div className={cn(cfaCardClassName, 'flex flex-col gap-1')}>
      <p className="font-body text-2xl font-semibold tabular-nums tracking-tight text-[var(--foreground)]">
        {value}
      </p>
      <p className={cfaMutedClassName}>{label}</p>
      {children}
    </div>
  );
}

function practiceHref(params: Record<string, string>): string {
  return `/labs/cfa/practice?${new URLSearchParams(params).toString()}`;
}

export function CfaOverview({ now: nowProp }: CfaOverviewProps = {}) {
  const copy = cfa.overview;
  const { bank, syllabus } = useCfa();
  const now = useMemo(() => nowProp ?? new Date(), [nowProp]);

  const view = useMemo(() => {
    const questionsById = indexQuestions(bank.questions);
    return {
      days: daysToExam(cfa.exam.date, now),
      due: dueCount(bank.reviewStates, questionsById, now),
      answered: answeredSummary(bank.attempts),
      rows: moduleRows(syllabus, bank.questions, bank.attempts),
      weakest: weakestLos(bank.attempts, questionsById),
      recent: lastCaptureSession(bank.questions),
      openFlags: bank.flags.filter((flag) => !flag.resolvedAt).length,
    };
  }, [bank, now, syllabus]);

  const examValue =
    view.days > 0 ? String(view.days) : view.days === 0 ? copy.examTodayLabel : copy.examPassedLabel;

  return (
    <div className="space-y-6">
      <CfaPageHeader heading={copy.heading} description={copy.description} />
      <CfaReady>
        {bank.questions.length === 0 ? (
          <section className={cn(cfaCardClassName, 'space-y-3')}>
            <Heading as="h2" size="sm">
              {copy.emptyHeading}
            </Heading>
            <Text variant="muted" size="sm">
              {copy.emptyDescription}
            </Text>
            <Link href="/labs/cfa/capture" className={cfaPrimaryButtonClassName}>
              {copy.captureCtaLabel}
            </Link>
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={copy.heading}>
          <Kpi value={examValue} label={view.days > 0 ? `${copy.daysToExamLabel} · ${cfa.exam.label}` : cfa.exam.label}>
            {cfa.exam.isPlaceholder ? (
              <p className="font-body text-xs text-[var(--mono-500)]">{cfa.exam.placeholderNote}</p>
            ) : null}
          </Kpi>
          <Kpi value={String(view.due)} label={copy.dueTodayLabel}>
            {view.due > 0 ? (
              <Link href="/labs/cfa/practice?deck=mistakes" className={cfaLinkClassName}>
                {copy.dueStartLabel}
              </Link>
            ) : (
              <p className="font-body text-xs text-[var(--mono-500)]">{copy.nothingDueLabel}</p>
            )}
          </Kpi>
          <Kpi value={String(bank.questions.length)} label={copy.bankLabel}>
            {view.openFlags > 0 ? (
              <Link href="/labs/cfa/questions?flagged=1" className={cfaLinkClassName}>
                {fill(copy.flaggedLabel, { count: view.openFlags })}
              </Link>
            ) : null}
          </Kpi>
          <Kpi
            value={String(view.answered.questionsAnswered)}
            label={`${copy.answeredLabel} · ${formatPercent(view.answered.overall.accuracy)} ${copy.accuracyLabel}`}
          />
        </section>

        <div className="flex flex-wrap gap-2">
          <Link href="/labs/cfa/practice" className={cfaPrimaryButtonClassName}>
            {copy.practiceCtaLabel}
          </Link>
          <Link href="/labs/cfa/capture" className={cfaSecondaryButtonClassName}>
            {copy.captureCtaLabel}
          </Link>
        </div>

        {view.recent.length > 0 ? (
          <section className={cn(cfaCardClassName, 'flex flex-wrap items-center justify-between gap-3')}>
            <div>
              <Heading as="h2" size="sm">
                {copy.recentHeading}
              </Heading>
              <p className={cfaMutedClassName}>
                {fill(copy.recentDescription, { count: view.recent.length })}
              </p>
            </div>
            <Link href="/labs/cfa/practice?deck=recent" className={cfaSecondaryButtonClassName}>
              {copy.recentStartLabel}
            </Link>
          </section>
        ) : null}

        <section className="space-y-2">
          <Heading as="h2" size="sm">
            {copy.modulesHeading}
          </Heading>
          <div className="overflow-hidden rounded-lg border border-[var(--border)]">
            <table className="w-full border-collapse font-body text-xs sm:text-sm">
              <thead className="bg-[var(--muted)] text-left text-[var(--mono-500)]">
                <tr>
                  <th scope="col" className="px-2 py-2 font-medium sm:px-3">{copy.columnModule}</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">{copy.columnWeight}</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">{copy.columnBank}</th>
                  <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">{copy.columnAttempts}</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium sm:px-3">{copy.columnAccuracy}</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.map((row) => (
                  <tr key={row.moduleId} className="border-t border-[var(--border)] align-top">
                    <th scope="row" className="px-2 py-2 text-left font-normal sm:px-3">
                      <Link
                        href={practiceHref({ module: row.moduleId })}
                        className="hover:text-[var(--primary)] hover:underline"
                      >
                        {row.name}
                      </Link>
                    </th>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                      {row.weightMin}–{row.weightMax}%
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{row.bank}</td>
                    <td className="hidden px-2 py-2 text-right tabular-nums sm:table-cell">{row.attempts}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums sm:px-3">
                      <AccuracyCell accuracy={row.accuracy} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="font-body text-xs text-[var(--mono-500)]">{cfa.weights.sourceLabel}</p>
        </section>

        <section className="space-y-2">
          <Heading as="h2" size="sm">
            {copy.weakestHeading}
          </Heading>
          <p className={cfaMutedClassName}>
            {fill(copy.weakestDescription, { min: WEAKEST_LOS_MIN_ATTEMPTS })}
          </p>
          {view.weakest.length === 0 ? (
            <p className={cfaMutedClassName}>{copy.weakestEmptyLabel}</p>
          ) : (
            <ol className="space-y-2">
              {view.weakest.map((row) => (
                <li key={row.key} className={cn(cfaCardClassName, 'flex flex-wrap items-start justify-between gap-2 p-3')}>
                  <div className="min-w-0">
                    <p className="font-body text-sm text-[var(--foreground)]">{row.los}</p>
                    <p className="font-body text-xs text-[var(--mono-500)]">
                      {moduleName(syllabus, row.module)} · {readingName(syllabus, row.module, row.reading)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-body text-sm tabular-nums">
                      {formatPercent(row.accuracy)} · {row.correct}/{row.attempts}
                    </span>
                    <Link
                      href={practiceHref({ module: row.module, los: row.los })}
                      className={cfaLinkClassName}
                    >
                      {copy.practiseLosLabel}
                    </Link>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </CfaReady>
    </div>
  );
}

/** Accuracy with a quiet bar; the bar length is accuracy, not weight. */
function AccuracyCell({ accuracy }: { accuracy: number | null }) {
  if (accuracy === null) return <span className="text-[var(--mono-500)]">—</span>;
  const pct = Math.round(accuracy * 100);
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span
        aria-hidden="true"
        className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-[var(--muted)] sm:inline-block"
      >
        <span
          className="block h-full rounded-full bg-[var(--primary)]"
          style={{ width: `${pct}%` }}
        />
      </span>
      {pct}%
    </span>
  );
}
