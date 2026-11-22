/**
 * Pure helpers for the CFA assist Lambda: argument validation, prompts,
 * image format mapping, the Bedrock request body and reply text, and JSON coercion. Kept free of AWS clients so Vitest
 * can cover them without live services.
 */

/** Env var Amplify sets when the function is granted access to `cfaScreenshots`. */
export const CFA_BUCKET_ENV = 'CFA_SCREENSHOTS_BUCKET_NAME';

export const CFA_ASSIST_TASKS = ['extract', 'draftExplanation'] as const;
export type CfaAssistTask = (typeof CFA_ASSIST_TASKS)[number];

/** Most screenshots one Capture may send to the model. */
export const MAX_ASSIST_IMAGES = 5;

const MAX_CONTEXT_CHARS = 20_000;
const JOB_ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;
const SCREENSHOT_KEY_PATTERN =
  /^screenshots\/[A-Za-z0-9_-]{1,80}\/[A-Za-z0-9_-]{1,80}\.(png|jpe?g|webp|gif)$/i;

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'gif';

export type AssistArguments = {
  jobId: string;
  task: CfaAssistTask;
  screenshotKeys: string[];
  context: Record<string, unknown>;
};

export type AssistArgumentsResult =
  | { ok: true; value: AssistArguments }
  | { ok: false; jobId: string | null; message: string };

export function isValidJobId(value: unknown): value is string {
  return typeof value === 'string' && JOB_ID_PATTERN.test(value);
}

export function isValidScreenshotKey(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    !value.includes('..') &&
    SCREENSHOT_KEY_PATTERN.test(value)
  );
}

/** Result object key for a job; only `assist/` is writable by the function. */
export function assistResultKey(jobId: string): string {
  return `assist/${jobId}.json`;
}

export function imageFormatForKey(key: string): ImageFormat | null {
  const match = key.toLowerCase().match(/\.(png|jpe?g|webp|gif)$/);
  if (!match) return null;
  const ext = match[1];
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg';
  return ext as ImageFormat;
}

export function parseAssistArguments(input: {
  jobId?: unknown;
  task?: unknown;
  screenshotKeys?: unknown;
  contextJson?: unknown;
}): AssistArgumentsResult {
  const jobId = isValidJobId(input.jobId) ? input.jobId : null;
  if (!jobId) {
    return { ok: false, jobId: null, message: 'Invalid job id.' };
  }
  if (
    typeof input.task !== 'string' ||
    !(CFA_ASSIST_TASKS as readonly string[]).includes(input.task)
  ) {
    return { ok: false, jobId, message: 'Unknown assist task.' };
  }
  const task = input.task as CfaAssistTask;

  const rawKeys = Array.isArray(input.screenshotKeys)
    ? input.screenshotKeys.filter((key) => key !== null && key !== undefined)
    : [];
  if (rawKeys.length > MAX_ASSIST_IMAGES) {
    return {
      ok: false,
      jobId,
      message: `Send at most ${MAX_ASSIST_IMAGES} screenshots at once.`,
    };
  }
  if (!rawKeys.every(isValidScreenshotKey)) {
    return { ok: false, jobId, message: 'Invalid screenshot key.' };
  }
  const screenshotKeys = rawKeys as string[];
  if (task === 'extract' && screenshotKeys.length === 0) {
    return { ok: false, jobId, message: 'Extraction needs a screenshot.' };
  }

  let context: Record<string, unknown> = {};
  if (input.contextJson !== undefined && input.contextJson !== null) {
    if (
      typeof input.contextJson !== 'string' ||
      input.contextJson.length > MAX_CONTEXT_CHARS
    ) {
      return { ok: false, jobId, message: 'Context is too large.' };
    }
    try {
      const parsed: unknown = JSON.parse(input.contextJson);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        context = parsed as Record<string, unknown>;
      }
    } catch {
      return { ok: false, jobId, message: 'Context is not valid JSON.' };
    }
  }

  return { ok: true, value: { jobId, task, screenshotKeys, context } };
}

export const EXTRACT_SYSTEM_PROMPT = `You transcribe exam-style practice questions from screenshots for a private study tool. The images are screenshots of a practice question from the user's study materials: usually one question, sometimes with a second image that shows the worked solution, and sometimes one shared scenario or exhibit followed by several lettered parts (1a, 1b, 1c).

Return ONLY valid JSON with this shape:
{"questions":[{"stem":string,"options":{"A":string,"B":string,"C":string},"answer":"A"|"B"|"C"|null,"explanation":string|null,"calculator":string|null,"part":string|null}]}

Rules:
- Treat all images as ONE question unless they clearly contain separate, complete questions or lettered parts. A solution image belongs to the question it solves.
- Multi-part questions: when one shared scenario or exhibit is followed by lettered parts (for example 1a, 1b, 1c or (a), (b), (c)), each with its own A/B/C options, return every part as a separate question, in the order shown. Repeat the full shared scenario and every exhibit (as Markdown tables) at the top of each part's stem, then that part's own question line, so each part can be answered on its own. Set "part" to the part's letter in lower case (for example "a"). For a question without parts, set "part" to null.
- Each question has exactly three options: A, B and C. Copy each option's text without its letter label.
- stem: the full question text, including any scenario, data and the final question line. Leave out any question number or part label in front of it (for example "1.", "12)", "Question 3:", "1a.", "(b)" or "Part c:"). Transcribe faithfully; do not paraphrase or solve.
- Tables: render any table or exhibit as a GitHub-flavoured Markdown table inside stem or explanation. If a figure cannot be a table, describe it in one short sentence.
- Maths: KaTeX syntax only — $...$ inline and $$...$$ on its own lines for display. Write percent signs inside maths as \\%. Never use \\( \\) or \\[ \\].
- answer: only when the correct answer is visibly marked or stated in the images; otherwise null. Never guess.
- explanation: the worked solution or explanation when it is visible in the images, transcribed in Markdown; otherwise null. Do not write your own. For a multi-part question, give each part only its own explanation.
- calculator: financial-calculator keystrokes only if they are shown (for example "N = 5, I/Y = 4, PMT = 0, FV = 100, CPT PV"); otherwise null.
- British English for anything you write yourself. No commentary outside the JSON.`;

export const DRAFT_SYSTEM_PROMPT = `You write concise worked explanations for exam-style multiple-choice practice questions with three options (A, B and C) in a private study tool. The correct answer has been confirmed by the user. Explain why it is correct and, briefly, why each other option is wrong.

Return ONLY valid JSON with this shape:
{"explanation":string,"calculator":string|null}

Rules:
- explanation: Markdown, about 200 words at most. Show the key formula and working with KaTeX ($...$ inline, $$...$$ on its own lines for display; write percent signs inside maths as \\%). Use a Markdown table when it helps.
- calculator: financial-calculator keystrokes when the calculation benefits from them; otherwise null.
- Do not change the confirmed answer. If you believe it is wrong, still explain it, then add a final line that starts "Check:" and says why.
- British English. No commentary outside the JSON.`;

function contextLine(context: Record<string, unknown>, key: string, label: string) {
  const value = context[key];
  return typeof value === 'string' && value.trim()
    ? `${label}: ${value.trim()}`
    : null;
}

export function buildUserPrompt(
  task: CfaAssistTask,
  context: Record<string, unknown>,
  imageCount: number,
): string {
  if (task === 'extract') {
    const lines = [
      `Transcribe the practice question in ${
        imageCount === 1 ? 'this screenshot' : `these ${imageCount} screenshots`
      } into the JSON shape described.`,
      contextLine(context, 'moduleName', 'Module'),
      contextLine(context, 'readingName', 'Reading'),
    ];
    return lines.filter(Boolean).join('\n');
  }
  return [
    'Write the explanation for this question. Question JSON:',
    JSON.stringify(context.question ?? {}),
    contextLine(context, 'moduleName', 'Module'),
    contextLine(context, 'readingName', 'Reading'),
    imageCount > 0
      ? 'The original screenshots are attached for reference.'
      : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function systemPromptFor(task: CfaAssistTask): string {
  return task === 'extract' ? EXTRACT_SYSTEM_PROMPT : DRAFT_SYSTEM_PROMPT;
}

/** Default model: Claude Haiku 5.5 on Amazon Bedrock (vision, structured JSON). */
export const DEFAULT_CFA_MODEL_ID = 'anthropic.claude-haiku-5-5';

/** `anthropic_version` for the Messages body sent through Bedrock InvokeModel. */
export const BEDROCK_ANTHROPIC_VERSION = 'bedrock-2023-05-31';

/**
 * Output cap. Claude Haiku 5.5 thinks by default and thinking counts towards
 * `max_tokens`; multi-part questions repeat the shared scenario in every part.
 */
export const ASSIST_MAX_TOKENS = 16_000;

/**
 * The handler sends Anthropic's Messages body through Bedrock InvokeModel, so
 * only Claude models on Bedrock work (`anthropic.…`, or an inference profile
 * such as `us.anthropic.…` / `global.anthropic.…`).
 */
export function isClaudeModelId(modelId: string): boolean {
  return /(^|[.:/])anthropic\.claude-/.test(modelId);
}

export type AssistImage = { format: ImageFormat; base64: string };

/**
 * InvokeModel body: Messages API shape with base64 image blocks first, then the
 * text prompt. No sampling parameters: current Claude models reject them.
 */
export function buildMessagesBody(input: {
  system: string;
  prompt: string;
  images: AssistImage[];
}): Record<string, unknown> {
  return {
    anthropic_version: BEDROCK_ANTHROPIC_VERSION,
    max_tokens: ASSIST_MAX_TOKENS,
    system: input.system,
    messages: [
      {
        role: 'user',
        content: [
          ...input.images.map((image) => ({
            type: 'image',
            source: {
              type: 'base64',
              media_type: `image/${image.format}`,
              data: image.base64,
            },
          })),
          { type: 'text', text: input.prompt },
        ],
      },
    ],
  };
}

/**
 * Text of a Messages reply. Reads `text` blocks by type (the reply can start
 * with `thinking` blocks) and turns a refusal or a cut-off reply into an error.
 */
export function messagesReplyText(body: unknown): string {
  const record =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  if (!record) throw new Error('The model reply could not be read.');
  if (record.stop_reason === 'refusal') {
    throw new Error('The model declined this request. Try again or type the question in.');
  }
  if (record.stop_reason === 'max_tokens') {
    throw new Error('The model reply was cut off. Try fewer screenshots at once.');
  }
  const content = Array.isArray(record.content) ? record.content : [];
  const text = content
    .map((block) =>
      block &&
      typeof block === 'object' &&
      (block as Record<string, unknown>).type === 'text' &&
      typeof (block as Record<string, unknown>).text === 'string'
        ? ((block as Record<string, unknown>).text as string)
        : '',
    )
    .join('')
    .trim();
  if (!text) throw new Error('The model reply had no text.');
  return text;
}

/** Strip code fences / surrounding prose and return a JSON object string. */
export function coerceJsonObject(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = (fenced?.[1] ?? raw).trim();
  if (!candidate.startsWith('{')) {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end <= start) {
      throw new Error('Model reply contained no JSON object.');
    }
    candidate = candidate.slice(start, end + 1);
  }
  const parsed: unknown = JSON.parse(candidate);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Model reply was not a JSON object.');
  }
  return candidate;
}

export type AssistResultEnvelope =
  | {
      jobId: string;
      task: CfaAssistTask;
      status: 'done';
      output: string;
      modelId: string;
      finishedAt: string;
    }
  | {
      jobId: string;
      task: CfaAssistTask | null;
      status: 'error';
      message: string;
      finishedAt: string;
    };
