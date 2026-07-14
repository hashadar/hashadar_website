import type { S3Handler } from 'aws-lambda';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/job-market-ingest';
import type { Schema } from '../../data/resource';
import {
  ingestJobDescription,
  type JobDescriptionRecord,
} from './ingest';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();
const s3 = new S3Client();

async function upsertJobDescription(
  record: JobDescriptionRecord,
): Promise<void> {
  const payload = {
    id: record.id,
    s3Key: record.s3Key,
    contentHash: record.contentHash,
    collectedAt: record.collectedAt,
    status: record.status,
    ...(record.title !== undefined ? { title: record.title } : {}),
    ...(record.seniority !== undefined ? { seniority: record.seniority } : {}),
    ...(record.roleFamily !== undefined ? { roleFamily: record.roleFamily } : {}),
    ...(record.source !== undefined ? { source: record.source } : {}),
  };

  const existing = await client.models.JobDescription.get({ id: record.id });
  if (existing.data) {
    const { errors } = await client.models.JobDescription.update(payload);
    if (errors?.length) {
      throw new Error(errors.map((error) => error.message).join('; '));
    }
    return;
  }

  const { errors } = await client.models.JobDescription.create(payload);
  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
}

function decodeS3Key(key: string): string {
  return decodeURIComponent(key.replace(/\+/g, ' '));
}

export const handler: S3Handler = async (event) => {
  for (const record of event.Records) {
    const s3Key = decodeS3Key(record.s3.object.key);
    if (!s3Key.startsWith('raw/')) {
      continue;
    }

    const bucket = record.s3.bucket.name;
    const object = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: s3Key }),
    );
    const body = await object.Body?.transformToString('utf-8');
    if (!body) {
      const message = `[job-market-ingest] Empty object body for ${s3Key}`;
      console.error(message);
      throw new Error(message);
    }

    const result = await ingestJobDescription(
      { s3Key, body },
      { upsertJobDescription },
    );

    if (result.status === 'rejected') {
      const message = `[job-market-ingest] Rejected ${s3Key}: ${result.reason}`;
      console.error(message);
      throw new Error(message);
    }

    console.log(
      `[job-market-ingest] Ingested ${s3Key} hash=${result.record.contentHash}`,
    );
  }
};
