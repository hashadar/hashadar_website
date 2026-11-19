import { describe, expect, it } from 'vitest';
import {
  draftIssues,
  draftToInput,
  emptyDraft,
  questionToDraft,
  setDraftAnswer,
} from '@/lib/cfa/question';
import { makeQuestion, testSyllabus } from '@/test/fixtures/cfa';

const ready = emptyDraft({
  module: 'alpha',
  reading: 'alpha-one',
  stem: 'Placeholder stem?',
  options: ['one', 'two', 'three'],
  answer: 'C',
  answerConfirmed: true,
  explanation: '  Because placeholder.  ',
  explanationIsAiDrafted: true,
  source: '  Placeholder source ',
});

describe('question drafts', () => {
  it('needs a confirmed answer before saving', () => {
    expect(draftIssues(ready, testSyllabus)).toEqual([]);
    expect(draftIssues({ ...ready, answerConfirmed: false }, testSyllabus)).toEqual([
      'answerConfirmed',
    ]);
    expect(draftIssues({ ...ready, answer: null }, testSyllabus)).toEqual(['answer']);
  });

  it('asks for a fresh confirmation when the answer changes', () => {
    expect(setDraftAnswer(ready, 'C')).toBe(ready);
    expect(setDraftAnswer(ready, 'A')).toMatchObject({
      answer: 'A',
      answerConfirmed: false,
    });
  });

  it('checks Module, Reading, stem and all three options', () => {
    expect(
      draftIssues(
        { ...ready, module: 'nope', stem: ' ', options: ['one', '', 'three'] },
        testSyllabus,
      ),
    ).toEqual(['module', 'reading', 'stem', 'options']);
    expect(draftIssues({ ...ready, reading: 'beta-one' }, testSyllabus)).toEqual([
      'reading',
    ]);
  });

  it('trims into a save payload and drops the AI badge with no explanation', () => {
    expect(draftToInput(ready, testSyllabus)).toMatchObject({
      explanation: 'Because placeholder.',
      explanationIsAiDrafted: true,
      source: 'Placeholder source',
      los: null,
      calculator: null,
    });
    expect(
      draftToInput({ ...ready, explanation: ' ' }, testSyllabus).explanationIsAiDrafted,
    ).toBe(false);
    expect(() =>
      draftToInput({ ...ready, answerConfirmed: false }, testSyllabus),
    ).toThrow(/answerConfirmed/);
  });

  it('drops a question number typed in front of the stem and keeps LOS optional', () => {
    const input = draftToInput({ ...ready, stem: '4) Placeholder stem?', los: ' ' }, testSyllabus);
    expect(input.stem).toBe('Placeholder stem?');
    expect(input.los).toBeNull();
  });

  it('round-trips a saved Question as already confirmed', () => {
    const question = makeQuestion({ explanation: null, answer: 'B' });
    const draft = questionToDraft(question);
    expect(draft).toMatchObject({ answer: 'B', answerConfirmed: true, explanation: '' });
  });
});
