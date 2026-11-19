import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CfaOverview } from '@/components/sections/labs/cfa/cfa-overview';
import { createTestLab, renderWithLab } from '@/components/sections/labs/cfa/cfa-test-utils';
import { cfa } from '@/data';
import { makeAttempt, makeQuestion, makeReviewState } from '@/test/fixtures/cfa';

afterEach(() => cleanup());

const quant = cfa.syllabus.modules.find((module) => module.id === 'quant')!;

describe('CfaOverview', () => {
  it('shows exam countdown, due count, bank, accuracy by module and weakest LOS', async () => {
    const weak = makeQuestion({
      module: quant.id,
      reading: quant.readings[0].id,
      los: 'placeholder weak outcome',
      createdAt: '2026-11-17T09:00:00.000Z',
    });
    const other = makeQuestion({
      module: quant.id,
      reading: quant.readings[0].id,
      createdAt: '2026-11-17T09:30:00.000Z',
    });
    const attempts = [true, false, false, false, true].map((correct) =>
      makeAttempt({ questionId: weak.id, correct }),
    );
    const { lab } = createTestLab({
      questions: [weak, other],
      attempts,
      reviewStates: [makeReviewState({ questionId: weak.id, dueAt: '2026-11-18T00:00:00.000Z' })],
    });

    renderWithLab(<CfaOverview now={new Date('2026-11-19T12:00:00Z')} />, lab);

    expect(await screen.findByText(cfa.overview.dueStartLabel)).toHaveAttribute(
      'href',
      '/labs/cfa/practice?deck=mistakes',
    );
    expect(screen.getByText(new RegExp(cfa.overview.daysToExamLabel))).toBeInTheDocument();

    const row = screen.getByRole('row', { name: new RegExp(quant.name) });
    expect(within(row).getByText(`${quant.weight.min}–${quant.weight.max}%`)).toBeInTheDocument();
    expect(within(row).getAllByText('2')[0]).toBeInTheDocument();
    expect(within(row).getByText('40%')).toBeInTheDocument();

    expect(screen.getByText('placeholder weak outcome')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: cfa.overview.recentStartLabel })).toHaveAttribute(
      'href',
      '/labs/cfa/practice?deck=recent',
    );
  });

  it('invites a first capture on an empty bank', async () => {
    const { lab } = createTestLab();
    renderWithLab(<CfaOverview now={new Date('2026-11-19T12:00:00Z')} />, lab);
    expect(await screen.findByText(cfa.overview.emptyHeading)).toBeInTheDocument();
    expect(screen.getByText(cfa.overview.weakestEmptyLabel)).toBeInTheDocument();
  });
});
