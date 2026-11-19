'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CfaMarkdown } from '@/components/sections/labs/cfa/cfa-markdown';
import { CfaOptionButton, optionStateFor } from '@/components/sections/labs/cfa/cfa-question-view';
import {
  cfaCardClassName,
  cfaErrorClassName,
  cfaMutedClassName,
  cfaPrimaryButtonClassName,
  cfaSecondaryButtonClassName,
} from '@/components/sections/labs/cfa/cfa-ui';
import { useRecordAttempt } from '@/components/sections/labs/cfa/use-record-attempt';
import { cfa } from '@/data';
import { fill } from '@/lib/cfa/format';
import {
  formatClock,
  remainingSeconds,
  scoreSet,
  timedBudgetSeconds,
  type SetResult,
} from '@/lib/cfa/timed';
import { CFA_ANSWERS, type CfaAnswer, type CfaQuestion } from '@/lib/cfa/types';
import { cn } from '@/lib/utils';

export type CfaTimedRunnerProps = {
  questions: CfaQuestion[];
  setId: string;
  onFinish: (results: SetResult[], info: { timedOut: boolean; saveFailed: boolean }) => void;
  /** Injectable clock for Vitest. */
  now?: () => number;
};

/** Exam pace for the whole Set; no feedback until the end. */
export function CfaTimedRunner({ questions, setId, onFinish, now = Date.now }: CfaTimedRunnerProps) {
  const copy = cfa.runner;
  const record = useRecordAttempt();
  const budget = timedBudgetSeconds(questions.length);
  const [startedAt] = useState(() => now());
  const [remaining, setRemaining] = useState(budget);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, CfaAnswer>>({});
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const seconds = useRef<Record<string, number>>({});
  const viewStart = useRef(startedAt);
  const submitted = useRef(false);
  const question = questions[index];

  const noteTime = useCallback(() => {
    const id = questions[index]?.id;
    if (!id) return;
    const t = now();
    seconds.current[id] = (seconds.current[id] ?? 0) + (t - viewStart.current) / 1000;
    viewStart.current = t;
  }, [index, now, questions]);

  const submit = useCallback(
    async (timedOut: boolean) => {
      if (submitted.current) return;
      submitted.current = true;
      noteTime();
      setSubmitting(true);
      const results = scoreSet(questions, answers, seconds.current);
      let saveFailed = false;
      for (const result of results) {
        try {
          await record(result, 'timed', setId);
        } catch {
          saveFailed = true;
        }
      }
      onFinish(results, { timedOut, saveFailed });
    },
    [answers, noteTime, onFinish, questions, record, setId],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      const left = remainingSeconds(startedAt, budget, now());
      setRemaining(left);
      if (left === 0) void submit(true);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [budget, now, startedAt, submit]);

  if (!question) return <p className={cfaMutedClassName}>{copy.emptyLabel}</p>;

  function go(next: number) {
    noteTime();
    setConfirming(false);
    setIndex(Math.max(0, Math.min(questions.length - 1, next)));
  }

  const unanswered = questions.filter((item) => !answers[item.id]).length;
  const lowTime = remaining <= 60;

  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-10 -mx-1 flex items-center justify-between gap-3 rounded-lg bg-[var(--background)]/95 px-1 py-2 backdrop-blur-sm">
        <p className={cfaMutedClassName}>
          {fill(copy.progressLabel, { index: index + 1, count: questions.length })}
        </p>
        <p
          className={cn(
            'font-body text-lg font-semibold tabular-nums',
            lowTime && 'text-red-700 dark:text-red-400',
          )}
          role="timer"
          aria-label={copy.timeLeftLabel}
        >
          {formatClock(remaining)}
        </p>
      </div>

      <article className={cn(cfaCardClassName, 'space-y-4')}>
        <CfaMarkdown markdown={question.stem} />
        <div role="group" aria-label={copy.answerGroupLabel} className="space-y-2">
          {CFA_ANSWERS.map((letter, optionIndex) => (
            <CfaOptionButton
              key={letter}
              letter={letter}
              text={question.options[optionIndex]}
              state={optionStateFor(letter, answers[question.id] ?? null, question.answer, false)}
              disabled={submitting}
              onSelect={() => setAnswers((current) => ({ ...current, [question.id]: letter }))}
            />
          ))}
        </div>
      </article>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cfaSecondaryButtonClassName}
          disabled={index === 0 || submitting}
          onClick={() => go(index - 1)}
        >
          {copy.previousLabel}
        </button>
        {index + 1 < questions.length ? (
          <button
            type="button"
            className={cfaPrimaryButtonClassName}
            disabled={submitting}
            onClick={() => go(index + 1)}
          >
            {copy.nextLabel}
          </button>
        ) : null}
      </div>

      <nav aria-label={copy.paletteLabel}>
        <ol className="flex flex-wrap gap-1.5">
          {questions.map((item, itemIndex) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => go(itemIndex)}
                aria-current={itemIndex === index ? 'step' : undefined}
                aria-label={fill(copy.questionLabel, { index: itemIndex + 1 })}
                className={cn(
                  'h-10 w-10 rounded-md border font-body text-sm tabular-nums',
                  answers[item.id]
                    ? 'border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_14%,transparent)]'
                    : 'border-[var(--border)]',
                  itemIndex === index && 'ring-2 ring-[var(--primary)]',
                )}
              >
                {itemIndex + 1}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-2 border-t border-[var(--border)] pt-4">
        {confirming && unanswered > 0 ? (
          <p className={cfaErrorClassName}>{fill(copy.submitUnansweredLabel, { count: unanswered })}</p>
        ) : null}
        <button
          type="button"
          className={cfaPrimaryButtonClassName}
          disabled={submitting}
          onClick={() => {
            if (unanswered > 0 && !confirming) {
              setConfirming(true);
              return;
            }
            void submit(false);
          }}
        >
          {copy.submitLabel}
        </button>
      </div>
    </div>
  );
}
