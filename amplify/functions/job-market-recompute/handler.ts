import type { Schema } from '../../data/resource';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { env } from '$amplify/env/job-market-recompute';
import {
  DEFAULT_MAX_ACTIVE_DOCS,
  startRecompute,
  type AnalysisRunRecord,
} from './orchestrator';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();
const lambda = new LambdaClient({});

async function listInFlightRuns(): Promise<AnalysisRunRecord[]> {
  const { data, errors } = await client.models.AnalysisRun.list({
    filter: {
      or: [
        { status: { eq: 'queued' } },
        { status: { eq: 'running' } },
      ],
    },
  });
  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
  return (data ?? []).map((run) => ({
    id: run.id,
    status: run.status as AnalysisRunRecord['status'],
    createdAt: run.createdAt,
  }));
}

async function countActiveDocuments(): Promise<number> {
  const { data, errors } = await client.models.JobDescription.list({
    filter: { status: { eq: 'active' } },
  });
  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
  return data?.length ?? 0;
}

async function createRun(run: AnalysisRunRecord): Promise<AnalysisRunRecord> {
  const { data, errors } = await client.models.AnalysisRun.create({
    id: run.id,
    status: run.status,
  });
  if (errors?.length || !data) {
    throw new Error(errors?.map((error) => error.message).join('; ') ?? 'Failed to create run');
  }
  return {
    id: data.id,
    status: data.status as AnalysisRunRecord['status'],
    createdAt: data.createdAt,
  };
}

async function invokeWorker(runId: string): Promise<void> {
  const functionName = env.JOB_MARKET_ANALYSE_FUNCTION_NAME;
  if (!functionName) {
    throw new Error('JOB_MARKET_ANALYSE_FUNCTION_NAME is not configured');
  }

  await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'Event',
      Payload: Buffer.from(JSON.stringify({ runId })),
    }),
  );
}

export const handler: Schema['startJobMarketRecompute']['functionHandler'] = async () => {
  const result = await startRecompute({
    listInFlightRuns,
    countActiveDocuments,
    createRun,
    invokeWorker,
    maxActiveDocs: Number(env.MAX_ACTIVE_DOCS ?? DEFAULT_MAX_ACTIVE_DOCS),
  });

  if (result.status === 'rejected') {
    return { status: 'rejected', reason: result.reason };
  }

  return { status: 'started', runId: result.run.id };
};
