import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CfaPracticeRunner } from '@/components/sections/labs/cfa/cfa-practice-runner';
import { CfaTimedRunner } from '@/components/sections/labs/cfa/cfa-timed-runner';
import { createTestLab, renderWithLab } from '@/components/sections/labs/cfa/cfa-test-utils';
import { cfa } from '@/data';
import { makeQuestion } from '@/test/fixtures/cfa';

afterEach(() => cleanup());

const first = makeQuestion({
  stem: 'Placeholder question one?',
  options: ['Red', 'Green', 'Blue'],
  answer: 'C',
  explanation: 'Placeholder reasoning for blue.',
  explanationIsAiDrafted: true,
});
const second = makeQuestion({ stem: 'Placeholder question two?', answer: 'A' });

describe('CfaPracticeRunner', () => {
  it('gives instant feedback, records the Attempt and adds a wrong answer to the deck', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    const { lab, store } = createTestLab({ questions: [first, second] });
    renderWithLab(
      <CfaPracticeRunner questions={[first, second]} mode="practice" setId="set-1" onFinish={onFinish} />,
      lab,
    );

    await user.click(await screen.findByRole('button', { name: /Green/ }));
    expect(screen.getByText('Not quite. The answer is C.')).toBeInTheDocument();
    expect(screen.getByText('Placeholder reasoning for blue.')).toBeInTheDocument();
    expect(screen.getByText(cfa.common.aiDraftedBadge)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: cfa.runner.flagLabel })).toBeInTheDocument();

    await waitFor(async () => expect(await store.listAttempts()).toHaveLength(1));
    expect((await store.listAttempts())[0]).toMatchObject({
      questionId: first.id,
      chosen: 'B',
      correct: false,
      mode: 'practice',
      setId: 'set-1',
    });
    expect(await store.listReviewStates()).toEqual([
      expect.objectContaining({ questionId: first.id, box: 1 }),
    ]);

    await user.click(screen.getByRole('button', { name: cfa.runner.nextLabel }));
    await user.click(screen.getByRole('button', { name: /Option one/ }));
    expect(screen.getByText(cfa.runner.correctLabel)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: cfa.runner.finishLabel }));
    expect(onFinish).toHaveBeenCalledWith([
      expect.objectContaining({ questionId: first.id, correct: false }),
      expect.objectContaining({ questionId: second.id, correct: true }),
    ]);
  });

  it('saves a Flag with a note', async () => {
    const user = userEvent.setup();
    const { lab, store } = createTestLab({ questions: [first] });
    renderWithLab(
      <CfaPracticeRunner questions={[first]} mode="practice" setId="set-2" onFinish={vi.fn()} />,
      lab,
    );
    await user.click(await screen.findByRole('button', { name: /Blue/ }));
    await user.click(screen.getByRole('button', { name: cfa.runner.flagLabel }));
    await user.type(screen.getByLabelText(cfa.runner.flagNoteLabel), 'Option text was cut off');
    await user.click(screen.getByRole('button', { name: cfa.runner.flagSaveLabel }));
    expect(await screen.findByText(cfa.runner.flagSavedLabel)).toBeInTheDocument();
    expect(await store.listFlags()).toEqual([
      expect.objectContaining({ questionId: first.id, note: 'Option text was cut off' }),
    ]);
  });
});

describe('CfaTimedRunner', () => {
  it('hides feedback, asks before submitting with blanks, and scores blanks as wrong', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    const { lab, store } = createTestLab({ questions: [first, second] });
    renderWithLab(
      <CfaTimedRunner questions={[first, second]} setId="set-3" onFinish={onFinish} />,
      lab,
    );

    expect(await screen.findByRole('timer')).toHaveTextContent('3:00');
    await user.click(screen.getByRole('button', { name: /Blue/ }));
    expect(screen.queryByText(cfa.runner.correctLabel)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: cfa.runner.submitLabel }));
    expect(screen.getByText('Submit with 1 unanswered?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: cfa.runner.submitLabel }));

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(onFinish.mock.calls[0][0]).toEqual([
      expect.objectContaining({ questionId: first.id, chosen: 'C', correct: true }),
      expect.objectContaining({ questionId: second.id, chosen: null, correct: false }),
    ]);
    const attempts = await store.listAttempts();
    expect(attempts.map((attempt) => attempt.mode)).toEqual(['timed', 'timed']);
  });
});
