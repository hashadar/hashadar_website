'use client';

import { useEffect, useRef, useState } from 'react';
import { CfaFlagControl } from '@/components/sections/labs/cfa/cfa-flag-control';
import { CfaMarkdown } from '@/components/sections/labs/cfa/cfa-markdown';
import {
  CfaExplanation,
  CfaOptionButton,
  optionStateFor,
  ResultLine,
} from '@/components/sections/labs/cfa/cfa-question-view';
import {
  cfaCardClassName,
  cfaErrorClassName,
  cfaMutedClassName,
  cfaPrimaryButtonClassName,
} from '@/components/sections/labs/cfa/cfa-ui';
import { useRecordAttempt } from '@/components/sections/labs/cfa/use-record-attempt';
import { cfa } from '@/data';
import { fill } from '@/lib/cfa/format';
import type { SetResult } from '@/lib/cfa/timed';
import { CFA_ANSWERS, type CfaAnswer, type CfaAttemptMode, type CfaQuestion } from '@/lib/cfa/types';
import { cn } from '@/lib/utils';

export type CfaPracticeRunnerProps = {
  questions: CfaQuestion[];
  mode: Exclude<CfaAttemptMode, 'timed'>;
  setId: string;
  onFinish: (results: SetResult[]) => void;
};

const nowMs = () => Date.now();

/** Seconds since `startMs`, to 0.1 s. */
function secondsSince(startMs: number): number {
  return Math.round((nowMs() - startMs) / 100) / 10;
}

/** One Question at a time with instant feedback after each answer. */
export function CfaPracticeRunner({ questions, mode, setId, onFinish }: CfaPracticeRunnerProps) {
  const copy = cfa.runner;
  const record = useRecordAttempt();
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<CfaAnswer | null>(null);
  const [results, setResults] = useState<SetResult[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);
  const shownAt = useRef(0);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const question = questions[index];

  useEffect(() => {
    shownAt.current = nowMs();
  }, [index]);

  useEffect(() => {
    if (chosen) feedbackRef.current?.focus();
  }, [chosen]);

  if (!question) {
    return <p className={cfaMutedClassName}>{copy.emptyLabel}</p>;
  }

  function choose(letter: CfaAnswer) {
    if (chosen) return;
    setChosen(letter);
    const result: SetResult = {
      questionId: question.id,
      chosen: letter,
      correct: letter === question.answer,
      secondsTaken: secondsSince(shownAt.current),
    };
    setResults((current) => [...current, result]);
    record(result, mode, setId).catch(() => setSaveFailed(true));
  }

  function next() {
    if (index + 1 >= questions.length) {
      onFinish(results);
      return;
    }
    setChosen(null);
    setIndex(index + 1);
  }

  const last = index + 1 >= questions.length;

  return (
    <div className="space-y-4">
      <p className={cfaMutedClassName} aria-live="polite">
        {fill(copy.progressLabel, { index: index + 1, count: questions.length })}
      </p>
      <article className={cn(cfaCardClassName, 'space-y-4')}>
        <CfaMarkdown markdown={question.stem} />
        <div role="group" aria-label={copy.answerGroupLabel} className="space-y-2">
          {CFA_ANSWERS.map((letter, optionIndex) => (
            <CfaOptionButton
              key={letter}
              letter={letter}
              text={question.options[optionIndex]}
              state={optionStateFor(letter, chosen, question.answer, chosen !== null)}
              disabled={chosen !== null}
              onSelect={() => choose(letter)}
            />
          ))}
        </div>
      </article>

      {chosen ? (
        <div ref={feedbackRef} tabIndex={-1} className="space-y-4 focus:outline-none">
          <ResultLine correct={chosen === question.answer} letter={question.answer} />
          <CfaExplanation question={question} />
          {saveFailed ? (
            <p className={cfaErrorClassName} role="alert">
              {copy.saveErrorLabel}
            </p>
          ) : null}
          <div className="flex flex-wrap items-start gap-2">
            <button type="button" className={cfaPrimaryButtonClassName} onClick={next}>
              {last ? copy.finishLabel : copy.nextLabel}
            </button>
            <CfaFlagControl questionId={question.id} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
