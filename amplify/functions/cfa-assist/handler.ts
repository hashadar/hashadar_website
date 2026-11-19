import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Schema } from '../../data/resource';
import {
  assistResultKey,
  buildUserPrompt,
  CFA_BUCKET_ENV,
  coerceJsonObject,
  imageFormatForKey,
  parseAssistArguments,
  systemPromptFor,
  temperatureFor,
  type AssistResultEnvelope,
} from './assist-core';

const bedrock = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION ?? process.env.AWS_REGION,
});
const s3 = new S3Client({});

function extractText(response: {
  output?: { message?: { content?: Array<{ text?: string }> } };
}): string {
  const parts = response.output?.message?.content ?? [];
  return parts
    .map((part) => part.text ?? '')
    .join('')
    .trim();
}

async function readImage(bucket: string, key: string): Promise<ContentBlock> {
  const format = imageFormatForKey(key);
  if (!format) {
    throw new Error('Unsupported screenshot format.');
  }
  const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!object.Body) {
    throw new Error('Screenshot could not be read.');
  }
  const bytes = await object.Body.transformToByteArray();
  return { image: { format, source: { bytes } } };
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
  const modelId =
    process.env.BEDROCK_MODEL_ID ?? 'us.meta.llama4-maverick-17b-instruct-v1:0';

  try {
    const images = await Promise.all(
      screenshotKeys.map((key) => readImage(bucket, key)),
    );
    const temperature = temperatureFor(modelId);
    const response = await bedrock.send(
      new ConverseCommand({
        modelId,
        system: [{ text: systemPromptFor(task) }],
        messages: [
          {
            role: 'user',
            content: [
              ...images,
              { text: buildUserPrompt(task, context, images.length) },
            ],
          },
        ],
        inferenceConfig: {
          maxTokens: 4096,
          ...(temperature === undefined ? {} : { temperature }),
        },
      }),
    );
    const output = coerceJsonObject(extractText(response));
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
