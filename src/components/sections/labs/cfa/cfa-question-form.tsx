'use client';

import Link from 'next/link';
import { useDeferredValue, useId, useMemo, useState } from 'react';
import { useCfa } from '@/components/sections/labs/cfa/cfa-context';
import { CfaMarkdown } from '@/components/sections/labs/cfa/cfa-markdown';
import { CfaScreenshot } from '@/components/sections/labs/cfa/cfa-screenshot';
import {
  cfaBadgeClassName,
  cfaCardClassName,
  cfaErrorClassName,
  cfaFieldClassName,
  cfaLabelClassName,
  cfaMutedClassName,
  cfaPrimaryButtonClassName,
  cfaSecondaryButtonClassName,
  cfaWarningClassName,
} from '@/components/sections/labs/cfa/cfa-ui';
import { cfa } from '@/data';
import { findNearDuplicates } from '@/lib/cfa/duplicates';
import { fill, stemPreview } from '@/lib/cfa/format';
import {
  draftIssues,
  draftToInput,
  setDraftAnswer,
  type DraftIssue,
  type QuestionDraft,
} from '@/lib/cfa/question';
import { findModule, moduleName, readingName } from '@/lib/cfa/syllabus';
import { CFA_ANSWERS, type CfaAnswer, type CfaQuestionInput } from '@/lib/cfa/types';
import { cn } from '@/lib/utils';

export type AnswerOrigin = 'extracted' | 'missing' | 'saved';

export type CfaQuestionFormProps = {
  initial: QuestionDraft;
  answerOrigin: AnswerOrigin;
  /** Object URLs for screenshots still on this device, index-aligned with `screenshotKeys`. */
  localScreenshotUrls?: string[];
  losSuggested?: boolean;
  warnings?: string[];
  /** Skip this Question when looking for near-duplicates (editing). */
  excludeQuestionId?: string;
  saveLabel?: string;
  onSave: (input: CfaQuestionInput) => Promise<void>;
  onCancel?: () => void;
  /** Called whenever Module/Reading/source change (Capture remembers them). */
  onContextChange?: (draft: QuestionDraft) => void;
};

const ISSUE_COPY: Record<DraftIssue, string> = {
  module: cfa.form.issueModule,
  reading: cfa.form.issueReading,
  stem: cfa.form.issueStem,
  options: cfa.form.issueOptions,
  answer: cfa.form.issueAnswer,
  answerConfirmed: cfa.form.issueAnswerConfirmed,
};

export function CfaQuestionForm({
  initial,
  answerOrigin,
  localScreenshotUrls,
  losSuggested = false,
  warnings = [],
  excludeQuestionId,
  saveLabel,
  onSave,
  onCancel,
  onContextChange,
}: CfaQuestionFormProps) {
  const copy = cfa.form;
  const { lab, syllabus, bank } = useCfa();
  const [draft, setDraft] = useState<QuestionDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const formId = useId();

  const issues = draftIssues(draft, syllabus);
  const selectedModule = findModule(syllabus, draft.module);
  const deferredStem = useDeferredValue(draft.stem);
  const duplicates = useMemo(
    () => findNearDuplicates(deferredStem, bank.questions, { excludeId: excludeQuestionId }),
    [bank.questions, deferredStem, excludeQuestionId],
  );
  const losSuggestions = useMemo(() => {
    const values = new Set<string>();
    for (const question of bank.questions) {
      if (question.module === draft.module && question.los) values.add(question.los);
    }
    return [...values].sort();
  }, [bank.questions, draft.module]);

  function update(change: Partial<QuestionDraft>) {
    const next = { ...draft, ...change };
    setDraft(next);
    if ('module' in change || 'reading' in change || 'source' in change) {
      onContextChange?.(next);
    }
  }

  function chooseAnswer(answer: CfaAnswer) {
    setDraft((current) => setDraftAnswer(current, answer));
  }

  async function draftExplanation() {
    if (!lab || !draft.answer || !draft.answerConfirmed) return;
    setDrafting(true);
    setDraftError(null);
    try {
      const drafted = await lab.assist.draftExplanation({
        question: {
          stem: draft.stem,
          options: draft.options,
          answer: draft.answer,
          los: draft.los.trim() || null,
        },
        moduleName: moduleName(syllabus, draft.module),
        readingName: readingName(syllabus, draft.module, draft.reading),
        screenshotKeys: draft.screenshotKeys,
      });
      setDraft((current) => ({
        ...current,
        explanation: drafted.explanation,
        explanationIsAiDrafted: true,
        calculator: current.calculator.trim() ? current.calculator : drafted.calculator ?? '',
      }));
    } catch (error) {
      setDraftError(error instanceof Error && error.message ? error.message : copy.draftErrorLabel);
    } finally {
      setDrafting(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (issues.length > 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(draftToInput(draft, syllabus));
    } catch (error) {
      setSaveError(error instanceof Error && error.message ? error.message : copy.saveErrorLabel);
      setSaving(false);
    }
  }

  const hasScreenshots = draft.screenshotKeys.length > 0;
  const answerNote =
    answerOrigin === 'extracted'
      ? copy.answerExtractedNote
      : answerOrigin === 'missing'
        ? copy.answerMissingNote
        : null;

  return (
    <form
      onSubmit={save}
      aria-labelledby={`${formId}-heading`}
      className={cn('grid gap-6', hasScreenshots && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')}
    >
      <h2 id={`${formId}-heading`} className="sr-only">
        {saveLabel ?? copy.saveLabel}
      </h2>

      {hasScreenshots ? (
        <details open className="lg:sticky lg:top-20 lg:self-start">
          <summary className="cursor-pointer font-body text-sm font-medium text-[var(--foreground)]">
            {copy.screenshotHeading}
          </summary>
          <div className="mt-2 max-h-[70vh] space-y-3 overflow-y-auto">
            {draft.screenshotKeys.map((key, index) => (
              <CfaScreenshot
                key={key}
                storageKey={key}
                index={index}
                localUrl={localScreenshotUrls?.[index]}
              />
            ))}
          </div>
        </details>
      ) : null}

      <div className="min-w-0 space-y-5">
        {warnings.length > 0 ? (
          <div className={cn(cfaCardClassName, 'space-y-1 p-3')} role="status">
            <p className={cn(cfaWarningClassName, 'font-medium')}>{cfa.capture.warningsLabel}</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {warnings.map((warning) => (
                <li key={warning} className={cfaWarningClassName}>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={cfaLabelClassName}>
            {cfa.capture.moduleLabel}
            <select
              className={cfaFieldClassName}
              value={draft.module}
              onChange={(event) => {
                const next = findModule(syllabus, event.target.value);
                update({ module: event.target.value, reading: next?.readings[0]?.id ?? '' });
              }}
            >
              {syllabus.modules.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className={cfaLabelClassName}>
            {cfa.capture.readingLabel}
            <select
              className={cfaFieldClassName}
              value={draft.reading}
              onChange={(event) => update({ reading: event.target.value })}
            >
              {(selectedModule?.readings ?? []).map((reading) => (
                <option key={reading.id} value={reading.id}>
                  {reading.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={cfaLabelClassName}>
          {copy.stemLabel}
          <textarea
            className={cn(cfaFieldClassName, 'min-h-40 font-mono text-sm')}
            value={draft.stem}
            onChange={(event) => update({ stem: event.target.value })}
            aria-describedby={`${formId}-stem-help`}
          />
        </label>
        <p id={`${formId}-stem-help`} className="-mt-3 font-body text-xs text-[var(--mono-500)]">
          {copy.stemHelp}
        </p>

        {duplicates.length > 0 ? (
          <div className={cn(cfaCardClassName, 'space-y-1 border-amber-300 p-3 dark:border-amber-700')} role="status">
            <p className={cn(cfaWarningClassName, 'font-medium')}>{copy.duplicateHeading}</p>
            {duplicates.map((match) => (
              <p key={match.question.id} className={cfaMutedClassName}>
                {fill(copy.duplicateDescription, {
                  percent: `${Math.round(match.similarity * 100)}%`,
                })}{' '}
                <span className="text-[var(--foreground)]">“{stemPreview(match.question.stem, 90)}”</span>{' '}
                <Link
                  href={`/labs/cfa/questions/${encodeURIComponent(match.question.id)}`}
                  target="_blank"
                  className="underline underline-offset-4"
                >
                  {copy.duplicateOpenLabel}
                </Link>
              </p>
            ))}
          </div>
        ) : null}

        {draft.stem.trim() ? (
          <section className={cn(cfaCardClassName, 'space-y-2 bg-[var(--cream)] p-3')}>
            <p className="font-body text-xs font-medium uppercase tracking-[0.08em] text-[var(--mono-500)]">
              {copy.previewHeading}
            </p>
            <CfaMarkdown markdown={draft.stem} />
          </section>
        ) : null}

        <div className="space-y-3">
          {CFA_ANSWERS.map((letter, index) => (
            <label key={letter} className={cfaLabelClassName}>
              {fill(copy.optionLabel, { letter })}
              <textarea
                rows={2}
                className={cn(cfaFieldClassName, 'font-mono text-sm')}
                value={draft.options[index]}
                onChange={(event) => {
                  const options = [...draft.options] as QuestionDraft['options'];
                  options[index] = event.target.value;
                  update({ options });
                }}
              />
            </label>
          ))}
        </div>

        <fieldset className="space-y-2">
          <legend className="font-body text-sm font-medium text-[var(--foreground)]">
            {copy.answerLegend}
          </legend>
          {answerNote ? <p className={cfaMutedClassName}>{answerNote}</p> : null}
          <div className="space-y-2">
            {CFA_ANSWERS.map((letter, index) => {
              const selected = draft.answer === letter;
              return (
                <label
                  key={letter}
                  className={cn(
                    'flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5',
                    selected
                      ? 'border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_8%,transparent)]'
                      : 'border-[var(--border)]',
                  )}
                >
                  <input
                    type="radio"
                    name={`${formId}-answer`}
                    value={letter}
                    checked={selected}
                    onChange={() => chooseAnswer(letter)}
                    className="mt-1 accent-[var(--primary)]"
                  />
                  <span className="font-body text-sm font-semibold">{letter}</span>
                  <span className="min-w-0 flex-1">
                    {draft.options[index].trim() ? (
                      <CfaMarkdown markdown={draft.options[index]} inline />
                    ) : (
                      <span className={cfaMutedClassName}>—</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
          {draft.answer ? (
            <label className="flex min-h-11 items-center gap-3 rounded-lg bg-[var(--muted)] px-3 py-2 font-body text-sm text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={draft.answerConfirmed}
                onChange={(event) => setDraft((current) => ({ ...current, answerConfirmed: event.target.checked }))}
                className="h-5 w-5 accent-[var(--primary)]"
              />
              {fill(copy.answerConfirmLabel, { letter: draft.answer })}
            </label>
          ) : null}
        </fieldset>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={`${formId}-explanation`} className="font-body text-sm text-[var(--mono-500)]">
              {copy.explanationLabel}
            </label>
            {draft.explanationIsAiDrafted && draft.explanation.trim() ? (
              <span className={cfaBadgeClassName}>{cfa.common.aiDraftedBadge}</span>
            ) : null}
          </div>
          <textarea
            id={`${formId}-explanation`}
            className={cn(cfaFieldClassName, 'mt-0 min-h-32 font-mono text-sm')}
            value={draft.explanation}
            onChange={(event) => update({ explanation: event.target.value })}
          />
          <p className="font-body text-xs text-[var(--mono-500)]">{copy.explanationHelp}</p>
          {!draft.explanation.trim() ? (
            <div className="space-y-1">
              <button
                type="button"
                className={cfaSecondaryButtonClassName}
                onClick={draftExplanation}
                disabled={drafting || !draft.answer || !draft.answerConfirmed || !draft.stem.trim()}
              >
                {drafting ? copy.draftingLabel : copy.draftExplanationLabel}
              </button>
              {!draft.answerConfirmed ? (
                <p className="font-body text-xs text-[var(--mono-500)]">{copy.draftNeedsAnswerLabel}</p>
              ) : null}
              {draftError ? (
                <p className={cfaErrorClassName} role="alert">
                  {draftError}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <label className="flex items-center gap-2 font-body text-sm text-[var(--mono-500)]">
                <input
                  type="checkbox"
                  checked={draft.explanationIsAiDrafted}
                  onChange={(event) => update({ explanationIsAiDrafted: event.target.checked })}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                {copy.aiDraftedToggleLabel}
              </label>
              <section className={cn(cfaCardClassName, 'bg-[var(--cream)] p-3')}>
                <CfaMarkdown markdown={draft.explanation} />
              </section>
            </>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={cfaLabelClassName}>
              {copy.losLabel}
              <input
                className={cfaFieldClassName}
                value={draft.los}
                placeholder={copy.losPlaceholder}
                list={`${formId}-los`}
                aria-describedby={losSuggested ? `${formId}-los-note` : undefined}
                onChange={(event) => update({ los: event.target.value })}
              />
            </label>
            <datalist id={`${formId}-los`}>
              {losSuggestions.map((los) => (
                <option key={los} value={los} />
              ))}
            </datalist>
            {losSuggested ? (
              <p id={`${formId}-los-note`} className="mt-1 font-body text-xs text-[var(--mono-500)]">
                {copy.losSuggestedNote}
              </p>
            ) : null}
          </div>
          <label className={cfaLabelClassName}>
            {copy.calculatorLabel}
            <input
              className={cn(cfaFieldClassName, 'font-mono text-sm')}
              value={draft.calculator}
              placeholder={copy.calculatorPlaceholder}
              onChange={(event) => update({ calculator: event.target.value })}
            />
          </label>
        </div>

        <label className={cfaLabelClassName}>
          {cfa.capture.sourceLabel}
          <input
            className={cfaFieldClassName}
            value={draft.source}
            placeholder={cfa.capture.sourcePlaceholder}
            onChange={(event) => update({ source: event.target.value })}
          />
        </label>

        <div className="space-y-2 border-t border-[var(--border)] pt-4">
          {issues.length > 0 ? (
            <ul className="space-y-0.5" aria-live="polite">
              {issues.map((issue) => (
                <li key={issue} className={cfaMutedClassName}>
                  {ISSUE_COPY[issue]}
                </li>
              ))}
            </ul>
          ) : null}
          {saveError ? (
            <p className={cfaErrorClassName} role="alert">
              {saveError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className={cfaPrimaryButtonClassName}
              disabled={saving || issues.length > 0}
            >
              {saving ? copy.savingLabel : saveLabel ?? copy.saveLabel}
            </button>
            {onCancel ? (
              <button type="button" className={cfaSecondaryButtonClassName} onClick={onCancel}>
                {cfa.common.cancelLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}

