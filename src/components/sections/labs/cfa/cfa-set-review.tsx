'use client';

import Link from 'next/link';
import { Heading } from '@/components/ui';
import { CfaFlagControl } from '@/components/sections/labs/cfa/cfa-flag-control';
import {
  CfaExplanation,
  CfaQuestionStatic,
  ResultLine,
} from '@/components/sections/labs/cfa/cfa-question-view';
import {
  cfaCardClassName,
  cfaErrorClassName,
  cfaLinkClassName,
  cfaMutedClassName,
  cfaPrimaryButtonClassName,
  cfaSecondaryButtonClassName,
} from '@/components/sections/labs/cfa/cfa-ui';
import { cfa } from '@/data';
import { fill } from '@/lib/cfa/format';
import type { SetResult } from '@/lib/cfa/timed';
import type { CfaQuestion } from '@/lib/cfa/types';
import { cn } from '@/lib/utils';

export type CfaSetReviewProps = {
  questions: CfaQuestion[];
  results: SetResult[];
  timedOut?: boolean;
  saveFailed?: boolean;
  onNewSet: () => void;
};

/** End-of-Set score and a review of every Question with its explanation. */
export function CfaSetReview({ questions, results, timedOut, saveFailed, onNewSet }: CfaSetReviewProps) {
  const copy = cfa.runner;
  const byId = new Map(questions.map((question) => [question.id, question]));
  const correct = results.filter((result) => result.correct).length;
  const answered = results.filter((result) => result.chosen !== null);
  const average =
    answered.length > 0
      ? Math.round(answered.reduce((sum, result) => sum + result.secondsTaken, 0) / answered.length)
      : 0;

  return (
    <div className="space-y-5">
      <section className={cn(cfaCardClassName, 'space-y-2')} aria-live="polite">
        <Heading as="h2" size="sm">
          {copy.summaryHeading}
        </Heading>
        {timedOut ? <p className={cfaMutedClassName}>{copy.timeUpLabel}</p> : null}
        <p className="font-body text-2xl font-semibold tabular-nums">
          {fill(copy.scoreLabel, { correct, count: results.length })}
        </p>
        {answered.length > 0 ? (
          <p className={cfaMutedClassName}>{fill(copy.averageTimeLabel, { seconds: average })}</p>
        ) : null}
        {saveFailed ? (
          <p className={cfaErrorClassName} role="alert">
            {copy.saveErrorLabel}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" className={cfaPrimaryButtonClassName} onClick={onNewSet}>
            {copy.newSetLabel}
          </button>
          <Link href="/labs/cfa" className={cfaSecondaryButtonClassName}>
            {cfa.common.backToOverviewLabel}
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <Heading as="h2" size="sm">
          {copy.reviewHeading}
        </Heading>
        <ol className="space-y-4">
          {results.map((result, index) => {
            const question = byId.get(result.questionId);
            if (!question) return null;
            return (
              <li key={result.questionId} className={cn(cfaCardClassName, 'space-y-4')}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className={cfaMutedClassName}>
                    {fill(copy.progressLabel, { index: index + 1, count: results.length })}
                  </p>
                  {result.chosen ? (
                    <ResultLine correct={result.correct} letter={question.answer} />
                  ) : (
                    <p className="font-body text-sm font-semibold text-[var(--mono-500)]">
                      {copy.unansweredLabel} · {copy.answerLabel} {question.answer}
                    </p>
                  )}
                </div>
                <CfaQuestionStatic question={question} chosen={result.chosen} />
                <CfaExplanation question={question} />
                <div className="flex flex-wrap items-start gap-3">
                  <CfaFlagControl questionId={question.id} />
                  <Link
                    href={`/labs/cfa/questions/${encodeURIComponent(question.id)}`}
                    className={cn(cfaLinkClassName, 'py-3')}
                  >
                    {copy.openQuestionLabel}
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
