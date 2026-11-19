import { describe, expect, it, vi } from 'vitest';
import {
  createAmplifyCfaStore,
  mapQuestionRow,
  type CfaAmplifyClient,
} from '@/lib/cfa/amplify-store';

function model(overrides: Record<string, unknown> = {}) {
  return {
    get: vi.fn(async () => ({ data: null })),
    list: vi.fn(async () => ({ data: [], nextToken: null })),
    create: vi.fn(async (input: Record<string, unknown>) => ({ data: { id: 'new', ...input } })),
    update: vi.fn(async (input: Record<string, unknown>) => ({ data: input })),
    delete: vi.fn(async () => ({ data: null })),
    ...overrides,
  };
}

function client(models: Partial<Record<keyof CfaAmplifyClient['models'], ReturnType<typeof model>>>) {
  return {
    models: {
      CfaQuestion: models.CfaQuestion ?? model(),
      CfaAttempt: models.CfaAttempt ?? model(),
      CfaReviewState: models.CfaReviewState ?? model(),
      CfaFlag: models.CfaFlag ?? model(),
    },
  } as unknown as CfaAmplifyClient;
}

const row = {
  id: 'q1',
  module: 'alpha',
  reading: 'alpha-one',
  stem: 'Placeholder?',
  options: ['one', null],
  answer: 'B',
  screenshotKeys: ['screenshots/c/1.png', null],
  createdAt: '2026-11-01T00:00:00.000Z',
};

describe('Amplify CFA store', () => {
  it('maps rows defensively (three options, no null keys)', () => {
    expect(mapQuestionRow(row)).toMatchObject({
      options: ['one', '', ''],
      answer: 'B',
      los: null,
      explanationIsAiDrafted: false,
      screenshotKeys: ['screenshots/c/1.png'],
    });
  });

  it('follows nextToken until every page is read', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({ data: [row], nextToken: 'page-2' })
      .mockResolvedValueOnce({ data: [{ ...row, id: 'q2' }, null], nextToken: null });
    const store = createAmplifyCfaStore(async () =>
      client({ CfaQuestion: model({ list }) }),
    );
    const questions = await store.listQuestions();
    expect(questions.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(list).toHaveBeenNthCalledWith(2, { limit: 1000, nextToken: 'page-2' });
  });

  it('throws on GraphQL errors', async () => {
    const store = createAmplifyCfaStore(async () =>
      client({
        CfaQuestion: model({
          list: vi.fn(async () => ({ data: null, errors: [{ message: 'Unauthorized' }] })),
        }),
      }),
    );
    await expect(store.listQuestions()).rejects.toThrow('List questions: Unauthorized');
  });

  it('creates a review state the first time and updates it after', async () => {
    const reviewModel = model();
    const store = createAmplifyCfaStore(async () => client({ CfaReviewState: reviewModel }));
    const state = {
      questionId: 'q1',
      box: 1,
      dueAt: '2026-11-02T00:00:00.000Z',
      lastResult: 'wrong' as const,
      lastAnsweredAt: '2026-11-01T10:00:00.000Z',
    };
    await store.putReviewState(state);
    expect(reviewModel.create).toHaveBeenCalledWith(state);

    reviewModel.get.mockResolvedValueOnce({ data: state as never });
    await store.putReviewState({ ...state, box: 2 });
    expect(reviewModel.update).toHaveBeenCalledWith({ ...state, box: 2 });
  });
});
