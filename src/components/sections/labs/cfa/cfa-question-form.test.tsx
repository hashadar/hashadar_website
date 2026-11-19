import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CfaQuestionForm } from '@/components/sections/labs/cfa/cfa-question-form';
import { createTestLab, renderWithLab } from '@/components/sections/labs/cfa/cfa-test-utils';
import { cfa } from '@/data';
import { emptyDraft } from '@/lib/cfa/question';
import { makeQuestion } from '@/test/fixtures/cfa';

afterEach(() => cleanup());

const moduleId = cfa.syllabus.modules[1].id;
const readingId = cfa.syllabus.modules[1].readings[0].id;

const extracted = emptyDraft({
  module: moduleId,
  reading: readingId,
  stem: 'A placeholder gizmo yields $4\\%$ a year. Which option is the closest?',
  options: ['Alpha', 'Bravo', 'Charlie'],
  answer: 'B',
});

describe('CfaQuestionForm', () => {
  it('will not save until the answer is confirmed, and asks again if it changes', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    const { lab } = createTestLab();
    renderWithLab(
      <CfaQuestionForm initial={extracted} answerOrigin="extracted" onSave={onSave} />,
      lab,
    );

    const save = await screen.findByRole('button', { name: cfa.form.saveLabel });
    expect(save).toBeDisabled();
    expect(screen.getByText(cfa.form.answerExtractedNote)).toBeInTheDocument();
    expect(screen.getByText(cfa.form.issueAnswerConfirmed)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /correct answer is B/ }));
    expect(save).toBeEnabled();

    await user.click(screen.getByRole('radio', { name: /C/ }));
    expect(screen.getByRole('checkbox', { name: /correct answer is C/ })).not.toBeChecked();
    expect(save).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: /correct answer is C/ }));
    await user.click(save);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ answer: 'C', module: moduleId, reading: readingId }),
    );
  });

  it('renders the stem through KaTeX in the preview', async () => {
    const { lab } = createTestLab();
    const { container } = renderWithLab(
      <CfaQuestionForm initial={extracted} answerOrigin="extracted" onSave={vi.fn()} />,
      lab,
    );
    await screen.findByText(cfa.form.previewHeading);
    expect(container.querySelector('.cfa-content .katex')).not.toBeNull();
  });

  it('drafts an explanation for the confirmed answer and badges it', async () => {
    const user = userEvent.setup();
    const { lab, assist } = createTestLab();
    renderWithLab(
      <CfaQuestionForm initial={extracted} answerOrigin="extracted" onSave={vi.fn()} />,
      lab,
    );

    const draftButton = await screen.findByRole('button', { name: cfa.form.draftExplanationLabel });
    expect(draftButton).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /correct answer is B/ }));
    await user.click(draftButton);

    await screen.findByText(cfa.common.aiDraftedBadge);
    expect(assist.draftExplanation).toHaveBeenCalledWith(
      expect.objectContaining({
        question: expect.objectContaining({ answer: 'B' }),
      }),
    );
    expect(screen.getByRole('checkbox', { name: cfa.form.aiDraftedToggleLabel })).toBeChecked();
  });

  it('warns about a near-duplicate already in the bank', async () => {
    const { lab } = createTestLab({
      questions: [makeQuestion({ stem: extracted.stem.replace('closest', 'nearest') })],
    });
    renderWithLab(
      <CfaQuestionForm initial={extracted} answerOrigin="extracted" onSave={vi.fn()} />,
      lab,
    );
    expect(await screen.findByText(cfa.form.duplicateHeading)).toBeInTheDocument();
  });
});
