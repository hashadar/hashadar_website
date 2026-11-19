import { nextReviewState } from '@/lib/cfa/leitner';
import type { CfaScreenshotStorage } from '@/lib/cfa/screenshots';
import type { CfaStore } from '@/lib/cfa/store';
import type { SetResult } from '@/lib/cfa/timed';
import type {
  CfaAttempt,
  CfaAttemptMode,
  CfaFlag,
  CfaQuestion,
  CfaQuestionInput,
  CfaReviewState,
} from '@/lib/cfa/types';

/** Everything the Lab shows, loaded once per page. */
export type CfaBank = {
  questions: CfaQuestion[];
  attempts: CfaAttempt[];
  reviewStates: CfaReviewState[];
  flags: CfaFlag[];
};

export type RecordedAttempt = {
  attempt: CfaAttempt;
  /** The Question's Leitner state after this Attempt (unchanged when not in the deck). */
  reviewState: CfaReviewState | null;
};

export type CfaService = {
  loadBank: () => Promise<CfaBank>;
  createQuestion: (input: CfaQuestionInput) => Promise<CfaQuestion>;
  updateQuestion: (id: string, input: CfaQuestionInput) => Promise<CfaQuestion>;
  /** Removes the Question, its Leitner state, Flags and screenshots; Attempts stay. */
  deleteQuestion: (question: CfaQuestion, bank: Pick<CfaBank, 'flags' | 'reviewStates'>) => Promise<void>;
  recordAttempt: (input: {
    result: SetResult;
    mode: CfaAttemptMode;
    setId: string | null;
    previous: CfaReviewState | null;
    answeredAt?: Date;
  }) => Promise<RecordedAttempt>;
  flagQuestion: (questionId: string, note: string) => Promise<CfaFlag>;
  resolveFlag: (flagId: string) => Promise<void>;
};

export function createCfaService(options: {
  store: CfaStore;
  screenshots: CfaScreenshotStorage;
  now?: () => Date;
}): CfaService {
  const { store, screenshots } = options;
  const now = options.now ?? (() => new Date());

  return {
    async loadBank() {
      const [questions, attempts, reviewStates, flags] = await Promise.all([
        store.listQuestions(),
        store.listAttempts(),
        store.listReviewStates(),
        store.listFlags(),
      ]);
      return { questions, attempts, reviewStates, flags };
    },
    createQuestion: (input) => store.createQuestion(input),
    updateQuestion: (id, input) => store.updateQuestion(id, input),
    async deleteQuestion(question, bank) {
      await store.deleteQuestion(question.id);
      const cleanups: Promise<unknown>[] = [];
      if (bank.reviewStates.some((state) => state.questionId === question.id)) {
        cleanups.push(store.deleteReviewState(question.id));
      }
      for (const flag of bank.flags) {
        if (flag.questionId === question.id) cleanups.push(store.deleteFlag(flag.id));
      }
      for (const key of question.screenshotKeys) {
        cleanups.push(screenshots.remove(key));
      }
      await Promise.allSettled(cleanups);
    },
    async recordAttempt({ result, mode, setId, previous, answeredAt }) {
      const when = answeredAt ?? now();
      const attempt = await store.createAttempt({
        questionId: result.questionId,
        chosen: result.chosen,
        correct: result.correct,
        secondsTaken: result.secondsTaken,
        mode,
        setId,
        answeredAt: when.toISOString(),
      });
      const update = nextReviewState(
        result.questionId,
        previous,
        result.correct ? 'correct' : 'wrong',
        when,
      );
      if (update.action === 'upsert') {
        await store.putReviewState(update.state);
        return { attempt, reviewState: update.state };
      }
      return { attempt, reviewState: previous };
    },
    flagQuestion: (questionId, note) => store.createFlag({ questionId, note }),
    resolveFlag: (flagId) => store.resolveFlag(flagId, now().toISOString()),
  };
}
