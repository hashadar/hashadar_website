import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Schema } from '../../data/resource';
import {
  assistResultKey,
  buildMessagesBody,
  buildUserPrompt,
  CFA_BUCKET_ENV,
  coerceJsonObject,
  DEFAULT_CFA_MODEL_ID,
  imageFormatForKey,
  isClaudeModelId,
  messagesReplyText,
  parseAssistArguments,
  systemPromptFor,
  type AssistImage,
  type AssistResultEnvelope,
} from './assist-core';

const bedrock = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION ?? process.env.AWS_REGION,
});
const s3 = new S3Client({});

async function readImage(bucket: string, key: string): Promise<AssistImage> {
  const format = imageFormatForKey(key);
  if (!format) {
    throw new Error('Unsupported screenshot format.');
  }
  const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!object.Body) {
    throw new Error('Screenshot could not be read.');
  }
  const bytes = await object.Body.transformToByteArray();
  return { format, base64: Buffer.from(bytes).toString('base64') };
}

async function writeResult(bucket: string, envelope: AssistResultEnvelope) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: assistResultKey(envelope.jobId),
      Body: JSON.stringify(envelope),
      ContentType: 'application/json',
    }),
  );
}

/**
 * Async (Event) invocation from `startCfaAssist`: the client polls
 * `assist/{jobId}.json` for the envelope this writes.
 */
export const handler: Schema['startCfaAssist']['functionHandler'] = async (
  event,
) => {
  const bucket = process.env[CFA_BUCKET_ENV];
  const parsed = parseAssistArguments(event.arguments);
  const finishedAt = () => new Date().toISOString();

  if (!bucket) {
    console.error('cfa-assist: bucket env var missing');
    return;
  }
  if (!parsed.ok) {
    if (parsed.jobId) {
      await writeResult(bucket, {
        jobId: parsed.jobId,
        task: null,
        status: 'error',
        message: parsed.message,
        finishedAt: finishedAt(),
      });
    }
    return;
  }

  const { jobId, task, screenshotKeys, context } = parsed.value;
  const modelId = process.env.BEDROCK_MODEL_ID?.trim() || DEFAULT_CFA_MODEL_ID;

  try {
    if (!isClaudeModelId(modelId)) {
      throw new Error(
        `CFA_BEDROCK_MODEL_ID must be a Claude model on Bedrock; got ${modelId}.`,
      );
    }
    const images = await Promise.all(
      screenshotKeys.map((key) => readImage(bucket, key)),
    );
    // Claude on Bedrock is served on bedrock-runtime through InvokeModel with
    // Anthropic's Messages body (not the Converse API).
    const response = await bedrock.send(
      new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(
          buildMessagesBody({
            system: systemPromptFor(task),
            prompt: buildUserPrompt(task, context, images.length),
            images,
          }),
        ),
      }),
    );
    const reply: unknown = JSON.parse(new TextDecoder().decode(response.body));
    const output = coerceJsonObject(messagesReplyText(reply));
    await writeResult(bucket, {
      jobId,
      task,
      status: 'done',
      output,
      modelId,
      finishedAt: finishedAt(),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message.trim().slice(0, 500)
        : 'The model call failed.';
    console.error('cfa-assist failed', { jobId, task, message });
    await writeResult(bucket, {
      jobId,
      task,
      status: 'error',
      message,
      finishedAt: finishedAt(),
    });
  }
};
