import { stripQuestionNumber } from '@/lib/cfa/extraction';
import { findReading } from '@/lib/cfa/syllabus';
import {
  CFA_ANSWERS,
  type CfaAnswer,
  type CfaOptions,
  type CfaQuestionInput,
  type CfaSyllabus,
} from '@/lib/cfa/types';

/** Editable state of the review form (Capture, Paste JSON preview, and edit). */
export type QuestionDraft = {
  module: string;
  reading: string;
  los: string;
  stem: string;
  options: CfaOptions;
  answer: CfaAnswer | null;
  /** The Site Admin has confirmed `answer` is correct (required to save). */
  answerConfirmed: boolean;
  explanation: string;
  explanationIsAiDrafted: boolean;
  calculator: string;
  source: string;
  screenshotKeys: string[];
  /** Question group fields, carried through unchanged (not edited in the form). */
  groupId: string | null;
  groupOrder: number | null;
  groupPart: string | null;
};

export type DraftIssue =
  | 'module'
  | 'reading'
  | 'stem'
  | 'options'
  | 'answer'
  | 'answerConfirmed';

export function emptyDraft(partial: Partial<QuestionDraft> = {}): QuestionDraft {
  return {
    module: '',
    reading: '',
    los: '',
    stem: '',
    options: ['', '', ''],
    answer: null,
    answerConfirmed: false,
    explanation: '',
    explanationIsAiDrafted: false,
    calculator: '',
    source: '',
    screenshotKeys: [],
    groupId: null,
    groupOrder: null,
    groupPart: null,
    ...partial,
  };
}

/** Changing the answer always needs a fresh confirmation. */
export function setDraftAnswer(
  draft: QuestionDraft,
  answer: CfaAnswer | null,
): QuestionDraft {
  if (draft.answer === answer) return draft;
  return { ...draft, answer, answerConfirmed: false };
}

export function draftIssues(
  draft: QuestionDraft,
  syllabus: CfaSyllabus,
): DraftIssue[] {
  const issues: DraftIssue[] = [];
  if (!syllabus.modules.some((module) => module.id === draft.module)) {
    issues.push('module');
  }
  if (!findReading(syllabus, draft.module, draft.reading)) {
    issues.push('reading');
  }
  if (!draft.stem.trim()) issues.push('stem');
  if (draft.options.some((option) => !option.trim())) issues.push('options');
  if (!draft.answer || !(CFA_ANSWERS as readonly string[]).includes(draft.answer)) {
    issues.push('answer');
  } else if (!draft.answerConfirmed) {
    issues.push('answerConfirmed');
  }
  return issues;
}

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Convert a valid draft into a save payload; throws if issues remain. */
export function draftToInput(
  draft: QuestionDraft,
  syllabus: CfaSyllabus,
): CfaQuestionInput {
  const issues = draftIssues(draft, syllabus);
  if (issues.length > 0 || !draft.answer) {
    throw new Error(`Question is not ready to save: ${issues.join(', ')}`);
  }
  const explanation = orNull(draft.explanation);
  return {
    module: draft.module,
    reading: draft.reading,
    los: orNull(draft.los),
    stem: stripQuestionNumber(draft.stem.trim()),
    options: [
      draft.options[0].trim(),
      draft.options[1].trim(),
      draft.options[2].trim(),
    ],
    answer: draft.answer,
    explanation,
    explanationIsAiDrafted: explanation !== null && draft.explanationIsAiDrafted,
    calculator: orNull(draft.calculator),
    source: orNull(draft.source),
    screenshotKeys: [...draft.screenshotKeys],
    groupId: draft.groupId,
    groupOrder: draft.groupId ? draft.groupOrder : null,
    groupPart: draft.groupId ? draft.groupPart : null,
  };
}

export function questionToDraft(question: CfaQuestionInput): QuestionDraft {
  return {
    module: question.module,
    reading: question.reading,
    los: question.los ?? '',
    stem: question.stem,
    options: [...question.options] as CfaOptions,
    answer: question.answer,
    // A saved Question's answer was confirmed when it was saved.
    answerConfirmed: true,
    explanation: question.explanation ?? '',
    explanationIsAiDrafted: question.explanationIsAiDrafted,
    calculator: question.calculator ?? '',
    source: question.source ?? '',
    screenshotKeys: [...question.screenshotKeys],
    groupId: question.groupId,
    groupOrder: question.groupOrder,
    groupPart: question.groupPart,
  };
}
