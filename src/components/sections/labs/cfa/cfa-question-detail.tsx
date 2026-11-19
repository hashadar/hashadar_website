'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Heading } from '@/components/ui';
import { useCfa } from '@/components/sections/labs/cfa/cfa-context';
import { CfaPageHeader, CfaReady } from '@/components/sections/labs/cfa/cfa-page-state';
import { CfaQuestionForm } from '@/components/sections/labs/cfa/cfa-question-form';
import { CfaExplanation, CfaQuestionStatic } from '@/components/sections/labs/cfa/cfa-question-view';
import { CfaScreenshot } from '@/components/sections/labs/cfa/cfa-screenshot';
import {
  cfaCardClassName,
  cfaErrorClassName,
  cfaLinkClassName,
  cfaMutedClassName,
  cfaPrimaryButtonClassName,
  cfaSecondaryButtonClassName,
} from '@/components/sections/labs/cfa/cfa-ui';
import { cfa } from '@/data';
import { fill, formatDate, formatDateTime } from '@/lib/cfa/format';
import { questionToDraft } from '@/lib/cfa/question';
import { moduleName, readingName } from '@/lib/cfa/syllabus';
import type { CfaAttemptMode, CfaQuestion, CfaQuestionInput } from '@/lib/cfa/types';
import { cn } from '@/lib/utils';

export function CfaQuestionDetail({ questionId }: { questionId: string }) {
  return (
    <div className="space-y-5">
      <Link href="/labs/cfa/questions" className={cfaLinkClassName}>
        ← {cfa.questionDetail.backLabel}
      </Link>
      <CfaReady>
        <DetailBody questionId={questionId} />
      </CfaReady>
    </div>
  );
}

const MODE_LABELS: Record<CfaAttemptMode, string> = {
  practice: cfa.questionDetail.modePracticeLabel,
  timed: cfa.questionDetail.modeTimedLabel,
  mistakes: cfa.questionDetail.modeMistakesLabel,
  recent: cfa.questionDetail.modeRecentLabel,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <Heading as="h2" size="sm">
        {title}
      </Heading>
      {children}
    </section>
  );
}

function DetailBody({ questionId }: { questionId: string }) {
  const copy = cfa.questionDetail;
  const router = useRouter();
  const { lab, bank, syllabus, updateBank } = useCfa();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const question = bank.questions.find((item) => item.id === questionId) ?? null;

  const history = useMemo(
    () =>
      bank.attempts
        .filter((attempt) => attempt.questionId === questionId)
        .sort((a, b) => b.answeredAt.localeCompare(a.answeredAt)),
    [bank.attempts, questionId],
  );
  const openFlags = bank.flags.filter((flag) => flag.questionId === questionId && !flag.resolvedAt);
  const deck = bank.reviewStates.find((state) => state.questionId === questionId) ?? null;

  if (!question) {
    return (
      <div className="space-y-2">
        <CfaPageHeader heading={copy.notFoundHeading} description={copy.notFoundDescription} />
      </div>
    );
  }

  async function save(input: CfaQuestionInput) {
    if (!lab || !question) return;
    const updated = await lab.service.updateQuestion(question.id, input);
    updateBank((current) => ({
      ...current,
      questions: current.questions.map((item) => (item.id === updated.id ? updated : item)),
    }));
    setEditing(false);
  }

  async function remove(target: CfaQuestion) {
    if (!lab) return;
    setDeleting(true);
    setError(null);
    try {
      await lab.service.deleteQuestion(target, bank);
      updateBank((current) => ({
        ...current,
        questions: current.questions.filter((item) => item.id !== target.id),
        reviewStates: current.reviewStates.filter((state) => state.questionId !== target.id),
        flags: current.flags.filter((flag) => flag.questionId !== target.id),
      }));
      router.push('/labs/cfa/questions');
    } catch {
      setError(cfa.form.saveErrorLabel);
      setDeleting(false);
    }
  }

  async function resolve(flagId: string) {
    if (!lab) return;
    await lab.service.resolveFlag(flagId);
    const resolvedAt = new Date().toISOString();
    updateBank((current) => ({
      ...current,
      flags: current.flags.map((flag) => (flag.id === flagId ? { ...flag, resolvedAt } : flag)),
    }));
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <CfaPageHeader heading={copy.editHeading} />
        <CfaQuestionForm
          initial={questionToDraft(question)}
          answerOrigin="saved"
          excludeQuestionId={question.id}
          onSave={save}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CfaPageHeader
        heading={copy.heading}
        description={`${moduleName(syllabus, question.module)} · ${readingName(syllabus, question.module, question.reading)}`}
        actions={
          <div className="flex gap-2">
            <button type="button" className={cfaSecondaryButtonClassName} onClick={() => setEditing(true)}>
              {copy.editLabel}
            </button>
            <button
              type="button"
              className={cfaSecondaryButtonClassName}
              onClick={() => setConfirmingDelete(true)}
            >
              {copy.deleteLabel}
            </button>
          </div>
        }
      />

      {confirmingDelete ? (
        <div className={cn(cfaCardClassName, 'space-y-3 border-red-300 dark:border-red-800')} role="alertdialog" aria-label={copy.deleteLabel}>
          <p className="font-body text-sm">{copy.deleteConfirmLabel}</p>
          {error ? <p className={cfaErrorClassName}>{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              className={cn(cfaPrimaryButtonClassName, 'bg-red-700 hover:bg-red-800')}
              disabled={deleting}
              onClick={() => void remove(question)}
            >
              {deleting ? copy.deletingLabel : copy.deleteConfirmButtonLabel}
            </button>
            <button type="button" className={cfaSecondaryButtonClassName} onClick={() => setConfirmingDelete(false)}>
              {cfa.common.cancelLabel}
            </button>
          </div>
        </div>
      ) : null}

      <article className={cn(cfaCardClassName, 'space-y-4')}>
        <CfaQuestionStatic question={question} />
        <CfaExplanation question={question} />
      </article>

      <dl className="grid gap-x-6 gap-y-2 font-body text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
        <dt className="text-[var(--mono-500)]">{cfa.form.losLabel}</dt>
        <dd>{question.los ?? '—'}</dd>
        <dt className="text-[var(--mono-500)]">{copy.sourceLabel}</dt>
        <dd>{question.source ?? '—'}</dd>
        <dt className="text-[var(--mono-500)]">{copy.createdLabel}</dt>
        <dd>{formatDate(question.createdAt)}</dd>
      </dl>

      <Section title={copy.screenshotsHeading}>
        {question.screenshotKeys.length === 0 ? (
          <p className={cfaMutedClassName}>{copy.noScreenshotsLabel}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {question.screenshotKeys.map((key, index) => (
              <CfaScreenshot key={key} storageKey={key} index={index} />
            ))}
          </div>
        )}
      </Section>

      <Section title={copy.flagsHeading}>
        {openFlags.length === 0 ? (
          <p className={cfaMutedClassName}>{copy.flagsEmptyLabel}</p>
        ) : (
          <ul className="space-y-2">
            {openFlags.map((flag) => (
              <li key={flag.id} className={cn(cfaCardClassName, 'flex flex-wrap items-start justify-between gap-2 p-3')}>
                <div>
                  <p className="font-body text-sm">{flag.note}</p>
                  <p className="font-body text-xs text-[var(--mono-500)]">{formatDateTime(flag.createdAt)}</p>
                </div>
                <button type="button" className={cfaSecondaryButtonClassName} onClick={() => void resolve(flag.id)}>
                  {copy.resolveFlagLabel}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={copy.reviewHeading}>
        <p className={cfaMutedClassName}>
          {deck ? fill(copy.reviewStateLabel, { box: deck.box, date: formatDate(deck.dueAt) }) : copy.notInDeckLabel}
        </p>
      </Section>

      <Section title={copy.historyHeading}>
        {history.length === 0 ? (
          <p className={cfaMutedClassName}>{copy.historyEmptyLabel}</p>
        ) : (
          <ul className="space-y-1">
            {history.map((attempt) => (
              <li key={attempt.id} className="font-body text-sm">
                {fill(copy.historyRowLabel, {
                  date: formatDateTime(attempt.answeredAt),
                  result: attempt.correct ? copy.historyCorrectLabel : copy.historyWrongLabel,
                  mode: MODE_LABELS[attempt.mode],
                  seconds: Math.round(attempt.secondsTaken),
                })}
                {attempt.chosen ? ` · ${attempt.chosen}` : ''}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
