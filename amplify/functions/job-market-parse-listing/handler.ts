import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/job-market-parse-listing';
import type { Schema } from '../../data/resource';
import type { ConverseFn } from './bedrock-extract';
import type { CreateScrapeCandidate, PutCandidateObject } from './enqueue';
import { parseJobListingFromUrl } from './parse-listing';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();
const s3 = new S3Client({});
const bedrock = new BedrockRuntimeClient({});

const putCandidateObject: PutCandidateObject = async ({ key, body }) => {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.JOB_MARKET_LAB_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: 'text/markdown; charset=utf-8',
    }),
  );
};

const createScrapeCandidate: CreateScrapeCandidate = async (input) => {
  const { data, errors } = await client.models.ScrapeCandidate.create({
    fileName: input.fileName,
    body: input.body,
    status: input.status,
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.source !== undefined ? { source: input.source } : {}),
    ...(input.collectedAt !== undefined ? { collectedAt: input.collectedAt } : {}),
    ...(input.candidateS3Key !== undefined
      ? { candidateS3Key: input.candidateS3Key }
      : {}),
  });
  if (errors?.length || !data) {
    throw new Error(
      errors?.map((error) => error.message).join('; ') ?? 'Failed to create scrape candidate',
    );
  }
  return {
    id: data.id,
    fileName: data.fileName,
    body: data.body,
    status: data.status as 'pending' | 'accepted' | 'rejected',
    title: data.title ?? undefined,
    source: data.source ?? undefined,
    collectedAt: data.collectedAt ?? undefined,
    candidateS3Key: data.candidateS3Key ?? undefined,
  };
};

const converse: ConverseFn = async (input) => {
  const response = await bedrock.send(
    new ConverseCommand({
      modelId: input.modelId,
      system: input.system,
      messages: input.messages,
      inferenceConfig: input.inferenceConfig,
      toolConfig: input.toolConfig,
    }),
  );
  return response;
};

export const handler: Schema['parseJobListingFromUrl']['functionHandler'] = async (
  event,
) => {
  const url = event.arguments.url ?? '';
  const pageText = event.arguments.pageText ?? undefined;
  const modelId = env.BEDROCK_PARSE_MODEL_ID;
  if (!modelId) {
    return {
      status: 'extract_failed',
      reason: 'BEDROCK_PARSE_MODEL_ID is not configured',
    };
  }

  const result = await parseJobListingFromUrl(
    { url, ...(pageText !== undefined ? { pageText } : {}) },
    {
      converse,
      modelId,
      enqueue: {
        putCandidateObject,
        createScrapeCandidate,
      },
    },
  );

  console.log(
    JSON.stringify({
      event: 'job-market-parse-listing',
      status: result.status,
      reason: result.reason,
      candidateId: result.candidateId,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCostUsd: result.estimatedCostUsd,
    }),
  );

  return {
    status: result.status,
    reason: result.reason,
    candidateId: result.candidateId,
    previewTitle: result.previewTitle,
    previewExcerpt: result.previewExcerpt,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    estimatedCostUsd: result.estimatedCostUsd,
  };
};
