import {
  parseExtractionOutput,
  type ExtractionResult,
} from '@/lib/cfa/extraction';
import { assistResultKey, newCfaId } from '@/lib/cfa/paths';
import type { CfaAnswer, CfaOptions } from '@/lib/cfa/types';

export type DraftExplanationInput = {
  question: {
    stem: string;
    options: CfaOptions;
    answer: CfaAnswer;
    los: string | null;
  };
  moduleName: string;
  readingName: string;
  screenshotKeys: string[];
};

export type DraftedExplanation = {
  explanation: string;
  calculator: string | null;
};

/** Bedrock-backed help for Capture: Extraction and drafted explanations. */
export type CfaAssist = {
  extract: (input: {
    screenshotKeys: string[];
    moduleName: string;
    readingName: string;
  }) => Promise<ExtractionResult>;
  draftExplanation: (input: DraftExplanationInput) => Promise<DraftedExplanation>;
};

export type StartAssistJob = (input: {
  jobId: string;
  task: 'extract' | 'draftExplanation';
  screenshotKeys: string[];
  contextJson: string;
}) => Promise<void>;

export const ASSIST_TIMEOUT_MS = 180_000;
export const ASSIST_POLL_MS = 2_000;

type Envelope =
  | { status: 'done'; output: string }
  | { status: 'error'; message: string };

function parseEnvelope(text: string): Envelope {
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Assist result was not an object.');
  }
  const record = parsed as Record<string, unknown>;
  if (record.status === 'done' && typeof record.output === 'string') {
    return { status: 'done', output: record.output };
  }
  if (record.status === 'error') {
    return {
      status: 'error',
      message: typeof record.message === 'string' ? record.message : 'Assist failed.',
    };
  }
  throw new Error('Assist result had an unknown status.');
}

export function parseDraftedExplanation(output: string): DraftedExplanation {
  const parsed: unknown = JSON.parse(output);
  const record =
    parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  const explanation =
    typeof record.explanation === 'string' ? record.explanation.trim() : '';
  if (!explanation) throw new Error('The draft had no explanation.');
  const calculator =
    typeof record.calculator === 'string' && record.calculator.trim()
      ? record.calculator.trim()
      : null;
  return { explanation, calculator };
}

/**
 * Start an async assist job, then poll storage for `assist/{jobId}.json`
 * until it appears or the timeout passes. The result object is removed after reading.
 */
export function createCfaAssist(options: {
  startJob: StartAssistJob;
  readText: (key: string) => Promise<string | null>;
  remove: (key: string) => Promise<void>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  timeoutMs?: number;
  pollMs?: number;
}): CfaAssist {
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? (() => Date.now());
  const timeoutMs = options.timeoutMs ?? ASSIST_TIMEOUT_MS;
  const pollMs = options.pollMs ?? ASSIST_POLL_MS;

  async function run(
    task: 'extract' | 'draftExplanation',
    screenshotKeys: string[],
    context: Record<string, unknown>,
  ): Promise<string> {
    const jobId = newCfaId('job');
    const key = assistResultKey(jobId);
    await options.startJob({
      jobId,
      task,
      screenshotKeys,
      contextJson: JSON.stringify(context),
    });
    const deadline = now() + timeoutMs;
    while (now() < deadline) {
      await sleep(pollMs);
      const text = await options.readText(key);
      if (text === null) continue;
      void options.remove(key).catch(() => undefined);
      const envelope = parseEnvelope(text);
      if (envelope.status === 'error') throw new Error(envelope.message);
      return envelope.output;
    }
    throw new Error('The model took too long to reply. Try again.');
  }

  return {
    async extract({ screenshotKeys, moduleName, readingName }) {
      const output = await run('extract', screenshotKeys, { moduleName, readingName });
      return parseExtractionOutput(output);
    },
    async draftExplanation({ question, moduleName, readingName, screenshotKeys }) {
      const output = await run('draftExplanation', screenshotKeys, {
        question: {
          stem: question.stem,
          options: { A: question.options[0], B: question.options[1], C: question.options[2] },
          answer: question.answer,
          los: question.los,
        },
        moduleName,
        readingName,
      });
      return parseDraftedExplanation(output);
    },
  };
}
