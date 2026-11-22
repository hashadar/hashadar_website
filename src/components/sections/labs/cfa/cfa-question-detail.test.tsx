import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CfaQuestionDetail } from '@/components/sections/labs/cfa/cfa-question-detail';
import { createTestLab, renderWithLab } from '@/components/sections/labs/cfa/cfa-test-utils';
import { cfa } from '@/data';
import { makeGroup, makeQuestion } from '@/test/fixtures/cfa';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => cleanup());

describe('CfaQuestionDetail', () => {
  it('lists the sibling parts in order with links', async () => {
    const [a, b, c] = makeGroup(3, { module: cfa.syllabus.modules[0].id });
    const { lab } = createTestLab({ questions: [c, a, b, makeQuestion()] });
    renderWithLab(<CfaQuestionDetail questionId={b.id} />, lab);

    const heading = await screen.findByRole('heading', { name: cfa.questionDetail.partsHeading });
    const list = within(heading.closest('section') as HTMLElement).getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items.map((item) => item.textContent?.slice(0, 6))).toEqual(['Part a', 'Part b', 'Part c']);
    expect(items[1]).toHaveAttribute('aria-current', 'page');
    expect(within(items[1]).queryByRole('link')).not.toBeInTheDocument();
    expect(within(items[0]).getByRole('link', { name: 'Part a' })).toHaveAttribute(
      'href',
      `/labs/cfa/questions/${a.id}`,
    );
    expect(within(items[2]).getByRole('link', { name: 'Part c' })).toHaveAttribute(
      'href',
      `/labs/cfa/questions/${c.id}`,
    );
  });

  it('shows no parts list for a standalone Question', async () => {
    const question = makeQuestion({ module: cfa.syllabus.modules[0].id });
    const { lab } = createTestLab({ questions: [question] });
    renderWithLab(<CfaQuestionDetail questionId={question.id} />, lab);
    expect(await screen.findByRole('heading', { name: cfa.questionDetail.heading })).toBeInTheDocument();
    expect(screen.queryByText(cfa.questionDetail.partsHeading)).not.toBeInTheDocument();
  });

  it('deletes one part and keeps its siblings in the group', async () => {
    const user = userEvent.setup();
    const [a, b] = makeGroup(2, { module: cfa.syllabus.modules[0].id });
    const { lab, store } = createTestLab({ questions: [a, b] });
    renderWithLab(<CfaQuestionDetail questionId={a.id} />, lab);

    await user.click(await screen.findByRole('button', { name: cfa.questionDetail.deleteLabel }));
    expect(screen.getByText(cfa.questionDetail.deleteGroupNote)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: cfa.questionDetail.deleteConfirmButtonLabel }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/labs/cfa/questions'));
    expect(await store.listQuestions()).toEqual([b]);
  });
});
