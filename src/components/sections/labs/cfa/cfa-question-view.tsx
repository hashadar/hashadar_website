'use client';

import { CfaMarkdown } from '@/components/sections/labs/cfa/cfa-markdown';
import {
  cfaBadgeClassName,
  cfaCorrectClassName,
  cfaMutedClassName,
} from '@/components/sections/labs/cfa/cfa-ui';
import { cfa } from '@/data';
import { fill } from '@/lib/cfa/format';
import { CFA_ANSWERS, type CfaAnswer, type CfaQuestion } from '@/lib/cfa/types';
import { cn } from '@/lib/utils';

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'answer';

/** Big tap target for one option (A/B/C) with its rendered text. */
export function CfaOptionButton({
  letter,
  text,
  state,
  disabled,
  onSelect,
}: {
  letter: CfaAnswer;
  text: string;
  state: OptionState;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={state === 'selected' || state === 'correct' || state === 'wrong'}
      className={cn(
        'flex min-h-14 w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors motion-reduce:transition-none disabled:cursor-default',
        state === 'idle' && 'border-[var(--border)] hover:border-[var(--primary)]',
        state === 'selected' &&
          'border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]',
        (state === 'correct' || state === 'answer') &&
          'border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40',
        state === 'wrong' && 'border-red-600 bg-red-50 dark:border-red-500 dark:bg-red-950/40',
      )}
    >
      <span
        className={cn(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-body text-sm font-semibold',
          state === 'selected' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-[var(--border)]',
        )}
      >
        {letter}
      </span>
      <span className="min-w-0 flex-1 pt-0.5">
        <CfaMarkdown markdown={text} inline />
      </span>
    </button>
  );
}

export function optionStateFor(
  letter: CfaAnswer,
  chosen: CfaAnswer | null,
  answer: CfaAnswer,
  revealed: boolean,
): OptionState {
  if (!revealed) return chosen === letter ? 'selected' : 'idle';
  if (letter === answer) return chosen === letter ? 'correct' : 'answer';
  if (letter === chosen) return 'wrong';
  return 'idle';
}

/** Explanation and calculator keystrokes, shown after an answer. */
export function CfaExplanation({ question }: { question: CfaQuestion }) {
  const copy = cfa.runner;
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-body text-sm font-medium">{copy.explanationHeading}</p>
          {question.explanation && question.explanationIsAiDrafted ? (
            <span className={cfaBadgeClassName}>{cfa.common.aiDraftedBadge}</span>
          ) : null}
        </div>
        {question.explanation ? (
          <CfaMarkdown markdown={question.explanation} />
        ) : (
          <p className={cfaMutedClassName}>{copy.noExplanationLabel}</p>
        )}
      </div>
      {question.calculator ? (
        <div className="space-y-1">
          <p className="font-body text-sm font-medium">{copy.calculatorHeading}</p>
          <p className="font-mono text-sm">{question.calculator}</p>
        </div>
      ) : null}
    </div>
  );
}

/** Read-only Question with every option and the correct answer marked. */
export function CfaQuestionStatic({
  question,
  chosen = null,
}: {
  question: CfaQuestion;
  chosen?: CfaAnswer | null;
}) {
  return (
    <div className="space-y-3">
      <CfaMarkdown markdown={question.stem} />
      <div className="space-y-2">
        {CFA_ANSWERS.map((letter, index) => (
          <CfaOptionButton
            key={letter}
            letter={letter}
            text={question.options[index]}
            state={optionStateFor(letter, chosen, question.answer, true)}
            disabled
          />
        ))}
      </div>
    </div>
  );
}

export function ResultLine({ correct, letter }: { correct: boolean; letter: CfaAnswer }) {
  return (
    <p
      className={cn(
        'font-body text-base font-semibold',
        correct ? cfaCorrectClassName : 'text-red-700 dark:text-red-400',
      )}
    >
      {correct ? cfa.runner.correctLabel : fill(cfa.runner.wrongLabel, { letter })}
    </p>
  );
}
