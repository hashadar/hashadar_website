import type {
  CfaAttempt,
  CfaAttemptInput,
  CfaFlag,
  CfaQuestion,
  CfaQuestionInput,
  CfaReviewState,
} from '@/lib/cfa/types';

/** Persistence port for the CFA Lab (Amplify Data in production, memory in tests). */
export type CfaStore = {
  listQuestions: () => Promise<CfaQuestion[]>;
  getQuestion: (id: string) => Promise<CfaQuestion | null>;
  createQuestion: (input: CfaQuestionInput) => Promise<CfaQuestion>;
  updateQuestion: (id: string, input: CfaQuestionInput) => Promise<CfaQuestion>;
  deleteQuestion: (id: string) => Promise<void>;

  listAttempts: () => Promise<CfaAttempt[]>;
  createAttempt: (input: CfaAttemptInput) => Promise<CfaAttempt>;

  listReviewStates: () => Promise<CfaReviewState[]>;
  putReviewState: (state: CfaReviewState) => Promise<void>;
  deleteReviewState: (questionId: string) => Promise<void>;

  listFlags: () => Promise<CfaFlag[]>;
  createFlag: (input: { questionId: string; note: string }) => Promise<CfaFlag>;
  resolveFlag: (id: string, resolvedAt: string) => Promise<void>;
  deleteFlag: (id: string) => Promise<void>;
};

export function createMemoryCfaStore(
  options: {
    questions?: CfaQuestion[];
    attempts?: CfaAttempt[];
    reviewStates?: CfaReviewState[];
    flags?: CfaFlag[];
    now?: () => Date;
  } = {},
): CfaStore {
  const now = options.now ?? (() => new Date());
  const questions = new Map((options.questions ?? []).map((q) => [q.id, q]));
  const attempts = [...(options.attempts ?? [])];
  const reviewStates = new Map(
    (options.reviewStates ?? []).map((state) => [state.questionId, state]),
  );
  const flags = new Map((options.flags ?? []).map((flag) => [flag.id, flag]));
  let counter = 0;
  const nextId = (prefix: string) => {
    counter += 1;
    return `${prefix}-${counter}`;
  };

  return {
    async listQuestions() {
      return [...questions.values()];
    },
    async getQuestion(id) {
      return questions.get(id) ?? null;
    },
    async createQuestion(input) {
      const question: CfaQuestion = {
        ...input,
        id: nextId('question'),
        createdAt: now().toISOString(),
        updatedAt: null,
      };
      questions.set(question.id, question);
      return question;
    },
    async updateQuestion(id, input) {
      const existing = questions.get(id);
      if (!existing) throw new Error('Question not found');
      const question: CfaQuestion = {
        ...existing,
        ...input,
        updatedAt: now().toISOString(),
      };
      questions.set(id, question);
      return question;
    },
    async deleteQuestion(id) {
      questions.delete(id);
    },
    async listAttempts() {
      return [...attempts];
    },
    async createAttempt(input) {
      const attempt: CfaAttempt = { ...input, id: nextId('attempt') };
      attempts.push(attempt);
      return attempt;
    },
    async listReviewStates() {
      return [...reviewStates.values()];
    },
    async putReviewState(state) {
      reviewStates.set(state.questionId, state);
    },
    async deleteReviewState(questionId) {
      reviewStates.delete(questionId);
    },
    async listFlags() {
      return [...flags.values()];
    },
    async createFlag({ questionId, note }) {
      const flag: CfaFlag = {
        id: nextId('flag'),
        questionId,
        note,
        resolvedAt: null,
        createdAt: now().toISOString(),
      };
      flags.set(flag.id, flag);
      return flag;
    },
    async resolveFlag(id, resolvedAt) {
      const flag = flags.get(id);
      if (flag) flags.set(id, { ...flag, resolvedAt });
    },
    async deleteFlag(id) {
      flags.delete(id);
    },
  };
}
