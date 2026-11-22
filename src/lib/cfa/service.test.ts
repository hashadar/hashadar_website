import { describe, expect, it } from 'vitest';
import { createMemoryCfaScreenshotStorage } from '@/lib/cfa/screenshots';
import { createCfaService } from '@/lib/cfa/service';
import { createMemoryCfaStore } from '@/lib/cfa/store';
import { makeGroup, makeQuestion, makeReviewState } from '@/test/fixtures/cfa';

function setup() {
  const question = makeQuestion({ screenshotKeys: ['screenshots/c-1/1.png'] });
  const store = createMemoryCfaStore({ questions: [question] });
  const screenshots = createMemoryCfaScreenshotStorage();
  void screenshots.upload('screenshots/c-1/1.png', new Blob(['x']), 'image/png');
  const service = createCfaService({
    store,
    screenshots,
    now: () => new Date(2026, 10, 10, 9, 0),
  });
  return { question, store, screenshots, service };
}

describe('CfaService.recordAttempt', () => {
  it('saves the Attempt and adds a wrong answer to the Mistakes deck', async () => {
    const { question, service, store } = setup();
    const recorded = await service.recordAttempt({
      result: { questionId: question.id, chosen: 'B', correct: false, secondsTaken: 40 },
      mode: 'practice',
      setId: 'set-1',
      previous: null,
    });
    expect(recorded.attempt).toMatchObject({
      questionId: question.id,
      chosen: 'B',
      correct: false,
      mode: 'practice',
      setId: 'set-1',
    });
    expect(recorded.reviewState).toMatchObject({ box: 1, lastResult: 'wrong' });
    expect(await store.listReviewStates()).toHaveLength(1);
    expect(await store.listAttempts()).toHaveLength(1);
  });

  it('leaves the deck alone for a correct answer on a Question not in it', async () => {
    const { question, service, store } = setup();
    const recorded = await service.recordAttempt({
      result: { questionId: question.id, chosen: 'A', correct: true, secondsTaken: 30 },
      mode: 'timed',
      setId: null,
      previous: null,
    });
    expect(recorded.reviewState).toBeNull();
    expect(await store.listReviewStates()).toEqual([]);
  });

  it('advances a due Question', async () => {
    const { question, service } = setup();
    const previous = makeReviewState({
      questionId: question.id,
      box: 1,
      dueAt: new Date(2026, 10, 10, 0, 0).toISOString(),
    });
    const recorded = await service.recordAttempt({
      result: { questionId: question.id, chosen: 'A', correct: true, secondsTaken: 30 },
      mode: 'mistakes',
      setId: null,
      previous,
    });
    expect(recorded.reviewState).toMatchObject({
      box: 2,
      dueAt: new Date(2026, 10, 13, 0, 0).toISOString(),
    });
  });
});

describe('CfaService.deleteQuestion', () => {
  it('removes the Question, its deck state, Flags and screenshots but keeps Attempts', async () => {
    const { question, service, store, screenshots } = setup();
    await service.recordAttempt({
      result: { questionId: question.id, chosen: 'C', correct: false, secondsTaken: 10 },
      mode: 'practice',
      setId: null,
      previous: null,
    });
    await service.flagQuestion(question.id, 'Option text looks cut off');
    const bank = await service.loadBank();
    await service.deleteQuestion(question, bank);

    const after = await service.loadBank();
    expect(after.questions).toEqual([]);
    expect(after.reviewStates).toEqual([]);
    expect(after.flags).toEqual([]);
    expect(after.attempts).toHaveLength(1);
    expect(screenshots.objects.size).toBe(0);
    expect(await store.getQuestion(question.id)).toBeNull();
  });
});

describe('CfaService.deleteQuestion in a Question group', () => {
  it('keeps the sibling parts, the group and the screenshots they still use', async () => {
    const shared = ['screenshots/c-2/1.png', 'screenshots/c-2/2.png'];
    const [a, b, c] = makeGroup(3, { screenshotKeys: shared });
    const store = createMemoryCfaStore({ questions: [a, b, c] });
    const screenshots = createMemoryCfaScreenshotStorage();
    for (const key of shared) await screenshots.upload(key, new Blob(['x']), 'image/png');
    const service = createCfaService({ store, screenshots });

    await service.deleteQuestion(b, await service.loadBank());
    const after = await service.loadBank();
    expect(after.questions.map((q) => [q.id, q.groupId, q.groupOrder])).toEqual([
      [a.id, a.groupId, 0],
      [c.id, a.groupId, 2],
    ]);
    expect(screenshots.objects.size).toBe(2);

    // The last part to go takes the screenshots with it.
    await service.deleteQuestion(a, await service.loadBank());
    expect(screenshots.objects.size).toBe(2);
    await service.deleteQuestion(c, await service.loadBank());
    expect(screenshots.objects.size).toBe(0);
  });
});

describe('CfaService flags', () => {
  it('resolves a Flag with a timestamp', async () => {
    const { question, service } = setup();
    const flag = await service.flagQuestion(question.id, 'Answer looks wrong');
    await service.resolveFlag(flag.id);
    const { flags } = await service.loadBank();
    expect(flags[0].resolvedAt).toBe(new Date(2026, 10, 10, 9, 0).toISOString());
  });
});
