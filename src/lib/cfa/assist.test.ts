import { describe, expect, it, vi } from 'vitest';
import { createCfaAssist, parseDraftedExplanation } from '@/lib/cfa/assist';

function harness(results: Array<string | null>) {
  let clock = 0;
  const startJob = vi.fn(async () => undefined);
  const readText = vi.fn(async () => (results.length ? results.shift()! : null));
  const remove = vi.fn(async () => undefined);
  const assist = createCfaAssist({
    startJob,
    readText,
    remove,
    sleep: async (ms) => {
      clock += ms;
    },
    now: () => clock,
    timeoutMs: 10_000,
    pollMs: 1_000,
  });
  return { assist, startJob, readText, remove };
}

const placeholderOutput = JSON.stringify({
  questions: [
    {
      stem: 'Placeholder stem?',
      options: { A: 'one', B: 'two', C: 'three' },
      answer: 'C',
      explanation: null,
      calculator: null,
    },
  ],
});

describe('createCfaAssist', () => {
  it('starts an extract job and polls until the result appears', async () => {
    const { assist, startJob, readText, remove } = harness([
      null,
      null,
      JSON.stringify({ status: 'done', output: placeholderOutput }),
    ]);
    const result = await assist.extract({
      screenshotKeys: ['screenshots/c-1/1.png'],
      moduleName: 'Alpha Module',
      readingName: 'Alpha Reading One',
    });
    expect(result.ok && result.questions[0].answer).toBe('C');
    expect(readText).toHaveBeenCalledTimes(3);
    const job = (startJob.mock.calls[0] as unknown[])[0] as {
      jobId: string;
      task: string;
      contextJson: string;
    };
    expect(job.task).toBe('extract');
    expect(JSON.parse(job.contextJson)).toEqual({
      moduleName: 'Alpha Module',
      readingName: 'Alpha Reading One',
    });
    expect(readText).toHaveBeenCalledWith(`assist/${job.jobId}.json`);
    expect(remove).toHaveBeenCalledWith(`assist/${job.jobId}.json`);
  });

  it('surfaces a failed job’s message', async () => {
    const { assist } = harness([
      JSON.stringify({ status: 'error', message: 'Model access denied' }),
    ]);
    await expect(
      assist.extract({ screenshotKeys: [], moduleName: '', readingName: '' }),
    ).rejects.toThrow('Model access denied');
  });

  it('gives up after the timeout', async () => {
    const { assist } = harness([]);
    await expect(
      assist.extract({ screenshotKeys: [], moduleName: '', readingName: '' }),
    ).rejects.toThrow(/too long/);
  });

  it('sends the confirmed answer when drafting an explanation', async () => {
    const { assist, startJob } = harness([
      JSON.stringify({
        status: 'done',
        output: JSON.stringify({ explanation: ' Because placeholder. ', calculator: '' }),
      }),
    ]);
    const draft = await assist.draftExplanation({
      question: {
        stem: 'Placeholder?',
        options: ['one', 'two', 'three'],
        answer: 'B',
        los: null,
      },
      moduleName: 'Alpha Module',
      readingName: 'Alpha Reading One',
      screenshotKeys: [],
    });
    expect(draft).toEqual({ explanation: 'Because placeholder.', calculator: null });
    const job = (startJob.mock.calls[0] as unknown[])[0] as { contextJson: string };
    expect(JSON.parse(job.contextJson).question).toMatchObject({
      answer: 'B',
      options: { A: 'one', B: 'two', C: 'three' },
    });
  });
});

describe('parseDraftedExplanation', () => {
  it('requires an explanation', () => {
    expect(() => parseDraftedExplanation('{"explanation":"  "}')).toThrow();
  });
});
