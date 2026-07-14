import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Handler } from 'aws-lambda';
import { env } from '$amplify/env/job-market-analyse';
import type { Schema } from '../../data/resource';
import { executeAnalysisRun } from './run';
import type { AnalysisRunRecord } from '../job-market-recompute/orchestrator';
import type { StoredCorpusSnapshot } from './run';
import type { JobDescriptionCorpusRecord } from './corpus';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();
const s3 = new S3Client({});
const bedrock = new BedrockRuntimeClient({});

const PUBLICATION_ID = 'current';

type AnalyseEvent = {
  runId: string;
};

async function listJobDescriptions(): Promise<JobDescriptionCorpusRecord[]> {
  const { data, errors } = await client.models.JobDescription.list();
  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
  return (data ?? []).map((record) => ({
    id: record.id,
    collectedAt: record.collectedAt,
    status: record.status as JobDescriptionCorpusRecord['status'],
    s3Key: record.s3Key,
    contentHash: record.contentHash,
    title: record.title ?? undefined,
    seniority: record.seniority ?? undefined,
    roleFamily: record.roleFamily ?? undefined,
    source: record.source ?? undefined,
  }));
}

async function saveJobDescription(
  record: JobDescriptionCorpusRecord,
): Promise<void> {
  const { errors } = await client.models.JobDescription.update({
    id: record.id,
    status: record.status,
  });
  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
}

async function loadMarkdown(s3Key: string): Promise<string> {
  const object = await s3.send(
    new GetObjectCommand({
      Bucket: env.JOB_MARKET_LAB_BUCKET_NAME,
      Key: s3Key,
    }),
  );
  const body = await object.Body?.transformToString('utf-8');
  if (!body) {
    throw new Error(`Empty object body for ${s3Key}`);
  }
  return body;
}

async function getCachedEmbedding(contentHash: string): Promise<number[] | null> {
  try {
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: env.JOB_MARKET_LAB_BUCKET_NAME,
        Key: `embeddings/${contentHash}.json`,
      }),
    );
    const body = await object.Body?.transformToString('utf-8');
    if (!body) {
      return null;
    }
    const parsed = JSON.parse(body) as { vector?: number[] };
    return Array.isArray(parsed.vector) ? parsed.vector : null;
  } catch {
    return null;
  }
}

async function putCachedEmbedding(
  contentHash: string,
  vector: number[],
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.JOB_MARKET_LAB_BUCKET_NAME,
      Key: `embeddings/${contentHash}.json`,
      Body: JSON.stringify({ vector }),
      ContentType: 'application/json',
    }),
  );
}

async function embed(text: string) {
  const modelId = env.BEDROCK_MODEL_ID;
  const response = await bedrock.send(
    new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: text.slice(0, 8000),
        dimensions: 256,
        normalize: true,
      }),
    }),
  );
  const payload = JSON.parse(new TextDecoder().decode(response.body)) as {
    embedding?: number[];
    inputTextTokenCount?: number;
  };
  if (!payload.embedding) {
    throw new Error('Bedrock embedding response did not include a vector');
  }
  const inputTokens = payload.inputTextTokenCount ?? Math.ceil(text.length / 4);
  // Titan embed rough cost placeholder for metrics (USD per 1k input tokens).
  const estimatedCostUsd = (inputTokens / 1000) * 0.0001;
  return {
    vector: payload.embedding,
    inputTokens,
    estimatedCostUsd,
  };
}

async function saveSnapshot(
  snapshot: StoredCorpusSnapshot,
): Promise<StoredCorpusSnapshot> {
  const { errors } = await client.models.CorpusSnapshot.create({
    id: snapshot.id,
    runId: snapshot.runId,
    // a.json() / AWSJSON inputs must be serialised JSON strings.
    payload: JSON.stringify(snapshot.payload),
  });
  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
  return snapshot;
}

async function updateRun(run: AnalysisRunRecord): Promise<AnalysisRunRecord> {
  const { errors } = await client.models.AnalysisRun.update({
    id: run.id,
    status: run.status,
    docsConsidered: run.docsConsidered,
    docsEmbedded: run.docsEmbedded,
    docsCacheHit: run.docsCacheHit,
    clusterCount: run.clusterCount,
    bedrockInputTokens: run.bedrockInputTokens,
    estimatedCostUsd: run.estimatedCostUsd,
    errorMessage: run.errorMessage,
  });
  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
  return run;
}

async function updatePublication(publication: {
  currentSnapshotId: string;
}): Promise<void> {
  const existing = await client.models.LabPublication.get({ id: PUBLICATION_ID });
  if (existing.data) {
    const { errors } = await client.models.LabPublication.update({
      id: PUBLICATION_ID,
      currentSnapshotId: publication.currentSnapshotId,
    });
    if (errors?.length) {
      throw new Error(errors.map((error) => error.message).join('; '));
    }
    return;
  }
  const { errors } = await client.models.LabPublication.create({
    id: PUBLICATION_ID,
    currentSnapshotId: publication.currentSnapshotId,
  });
  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
}

async function getPublication() {
  const { data } = await client.models.LabPublication.get({ id: PUBLICATION_ID });
  if (!data) {
    return null;
  }
  return { currentSnapshotId: data.currentSnapshotId };
}

export const handler: Handler<AnalyseEvent> = async (event) => {
  const runId = event.runId;
  if (!runId) {
    throw new Error('runId is required');
  }

  const result = await executeAnalysisRun({
    runId,
    listJobDescriptions,
    saveJobDescription,
    loadMarkdown,
    embed,
    getCachedEmbedding,
    putCachedEmbedding,
    saveSnapshot,
    updateRun,
    updatePublication,
    getPublication,
  });

  if (result.status === 'failed') {
    console.error(`[job-market-analyse] Run ${runId} failed: ${result.reason}`);
  } else {
    console.log(
      `[job-market-analyse] Run ${runId} succeeded snapshot=${result.snapshot.id}`,
    );
  }

  return result;
};
