import type { CfaStore } from '@/lib/cfa/store';
import {
  CFA_ANSWERS,
  CFA_ATTEMPT_MODES,
  type CfaAnswer,
  type CfaAttempt,
  type CfaAttemptMode,
  type CfaFlag,
  type CfaOptions,
  type CfaQuestion,
  type CfaReviewState,
} from '@/lib/cfa/types';

type Result<T> = {
  data: T;
  errors?: Array<{ message: string }> | null;
  nextToken?: string | null;
};

type ListInput = { limit?: number; nextToken?: string | null };

type ModelClient<TRow, TKey> = {
  get: (key: TKey) => Promise<Result<TRow | null>>;
  list: (input?: ListInput) => Promise<Result<Array<TRow | null> | null>>;
  create: (input: Record<string, unknown>) => Promise<Result<TRow | null>>;
  update: (input: Record<string, unknown>) => Promise<Result<TRow | null>>;
  delete: (key: TKey) => Promise<Result<TRow | null>>;
};

export type AmplifyCfaQuestionRow = {
  id: string;
  module: string;
  reading: string;
  los?: string | null;
  stem: string;
  options?: Array<string | null> | null;
  answer: string;
  explanation?: string | null;
  explanationIsAiDrafted?: boolean | null;
  calculator?: string | null;
  source?: string | null;
  screenshotKeys?: Array<string | null> | null;
  groupId?: string | null;
  groupOrder?: number | null;
  groupPart?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type AmplifyCfaAttemptRow = {
  id: string;
  questionId: string;
  chosen?: string | null;
  correct: boolean;
  secondsTaken?: number | null;
  mode: string;
  setId?: string | null;
  answeredAt: string;
};

export type AmplifyCfaReviewStateRow = {
  questionId: string;
  box: number;
  dueAt: string;
  lastResult: string;
  lastAnsweredAt: string;
};

export type AmplifyCfaFlagRow = {
  id: string;
  questionId: string;
  note: string;
  resolvedAt?: string | null;
  createdAt: string;
};

/** The slice of `generateClient()` the CFA Lab uses (kept narrow for tests). */
export type CfaAmplifyClient = {
  models: {
    CfaQuestion: ModelClient<AmplifyCfaQuestionRow, { id: string }>;
    CfaAttempt: ModelClient<AmplifyCfaAttemptRow, { id: string }>;
    CfaReviewState: ModelClient<AmplifyCfaReviewStateRow, { questionId: string }>;
    CfaFlag: ModelClient<AmplifyCfaFlagRow, { id: string }>;
  };
};

const PAGE_SIZE = 1000;

function unwrap<T>(result: Result<T>, action: string): T {
  if (result.errors?.length) {
    throw new Error(
      `${action}: ${result.errors.map((error) => error.message).join('; ')}`,
    );
  }
  return result.data;
}

async function listAll<TRow, TKey>(
  model: ModelClient<TRow, TKey>,
  action: string,
): Promise<TRow[]> {
  const rows: TRow[] = [];
  let nextToken: string | null | undefined = null;
  do {
    const result: Result<Array<TRow | null> | null> = await model.list({
      limit: PAGE_SIZE,
      nextToken,
    });
    for (const row of unwrap(result, action) ?? []) {
      if (row) rows.push(row);
    }
    nextToken = result.nextToken;
  } while (nextToken);
  return rows;
}

function toAnswer(value: string | null | undefined): CfaAnswer | null {
  return value && (CFA_ANSWERS as readonly string[]).includes(value)
    ? (value as CfaAnswer)
    : null;
}

function toOptions(values: Array<string | null> | null | undefined): CfaOptions {
  const list = values ?? [];
  return [list[0] ?? '', list[1] ?? '', list[2] ?? ''];
}

export function mapQuestionRow(row: AmplifyCfaQuestionRow): CfaQuestion {
  return {
    id: row.id,
    module: row.module,
    reading: row.reading,
    los: row.los ?? null,
    stem: row.stem,
    options: toOptions(row.options),
    answer: toAnswer(row.answer) ?? 'A',
    explanation: row.explanation ?? null,
    explanationIsAiDrafted: row.explanationIsAiDrafted === true,
    calculator: row.calculator ?? null,
    source: row.source ?? null,
    screenshotKeys: (row.screenshotKeys ?? []).filter(
      (key): key is string => typeof key === 'string' && key.length > 0,
    ),
    groupId: row.groupId || null,
    groupOrder: typeof row.groupOrder === 'number' ? row.groupOrder : null,
    groupPart: row.groupPart || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? null,
  };
}

export function mapAttemptRow(row: AmplifyCfaAttemptRow): CfaAttempt {
  const mode = (CFA_ATTEMPT_MODES as readonly string[]).includes(row.mode)
    ? (row.mode as CfaAttemptMode)
    : 'practice';
  return {
    id: row.id,
    questionId: row.questionId,
    chosen: toAnswer(row.chosen),
    correct: row.correct === true,
    secondsTaken: row.secondsTaken ?? 0,
    mode,
    setId: row.setId ?? null,
    answeredAt: row.answeredAt,
  };
}

export function mapReviewStateRow(row: AmplifyCfaReviewStateRow): CfaReviewState {
  return {
    questionId: row.questionId,
    box: row.box,
    dueAt: row.dueAt,
    lastResult: row.lastResult === 'correct' ? 'correct' : 'wrong',
    lastAnsweredAt: row.lastAnsweredAt,
  };
}

export function mapFlagRow(row: AmplifyCfaFlagRow): CfaFlag {
  return {
    id: row.id,
    questionId: row.questionId,
    note: row.note,
    resolvedAt: row.resolvedAt ?? null,
    createdAt: row.createdAt,
  };
}

function required<T>(value: T | null, action: string): T {
  if (!value) throw new Error(`${action}: no data returned`);
  return value;
}

export function createAmplifyCfaStore(
  getClient: () => Promise<CfaAmplifyClient>,
): CfaStore {
  return {
    async listQuestions() {
      const client = await getClient();
      return (await listAll(client.models.CfaQuestion, 'List questions')).map(
        mapQuestionRow,
      );
    },
    async getQuestion(id) {
      const client = await getClient();
      const row = unwrap(await client.models.CfaQuestion.get({ id }), 'Get question');
      return row ? mapQuestionRow(row) : null;
    },
    async createQuestion(input) {
      const client = await getClient();
      const row = unwrap(
        await client.models.CfaQuestion.create({ ...input, options: [...input.options] }),
        'Create question',
      );
      return mapQuestionRow(required(row, 'Create question'));
    },
    async updateQuestion(id, input) {
      const client = await getClient();
      const row = unwrap(
        await client.models.CfaQuestion.update({
          id,
          ...input,
          options: [...input.options],
        }),
        'Update question',
      );
      return mapQuestionRow(required(row, 'Update question'));
    },
    async deleteQuestion(id) {
      const client = await getClient();
      unwrap(await client.models.CfaQuestion.delete({ id }), 'Delete question');
    },
    async listAttempts() {
      const client = await getClient();
      return (await listAll(client.models.CfaAttempt, 'List attempts')).map(
        mapAttemptRow,
      );
    },
    async createAttempt(input) {
      const client = await getClient();
      const row = unwrap(await client.models.CfaAttempt.create(input), 'Save attempt');
      return mapAttemptRow(required(row, 'Save attempt'));
    },
    async listReviewStates() {
      const client = await getClient();
      return (
        await listAll(client.models.CfaReviewState, 'List review states')
      ).map(mapReviewStateRow);
    },
    async putReviewState(state) {
      const client = await getClient();
      const model = client.models.CfaReviewState;
      const existing = unwrap(
        await model.get({ questionId: state.questionId }),
        'Get review state',
      );
      unwrap(
        existing ? await model.update(state) : await model.create(state),
        'Save review state',
      );
    },
    async deleteReviewState(questionId) {
      const client = await getClient();
      unwrap(
        await client.models.CfaReviewState.delete({ questionId }),
        'Delete review state',
      );
    },
    async listFlags() {
      const client = await getClient();
      return (await listAll(client.models.CfaFlag, 'List flags')).map(mapFlagRow);
    },
    async createFlag(input) {
      const client = await getClient();
      const row = unwrap(await client.models.CfaFlag.create(input), 'Save flag');
      return mapFlagRow(required(row, 'Save flag'));
    },
    async resolveFlag(id, resolvedAt) {
      const client = await getClient();
      unwrap(await client.models.CfaFlag.update({ id, resolvedAt }), 'Resolve flag');
    },
    async deleteFlag(id) {
      const client = await getClient();
      unwrap(await client.models.CfaFlag.delete({ id }), 'Delete flag');
    },
  };
}
