import { createHash } from 'node:crypto';
import matter from 'gray-matter';

export type JobDescriptionStatus = 'active' | 'archived';

export type JobDescriptionRecord = {
  id: string;
  s3Key: string;
  contentHash: string;
  collectedAt: string;
  status: JobDescriptionStatus;
  title?: string;
  seniority?: string;
  roleFamily?: string;
  source?: string;
};

export type IngestResult =
  | { status: 'ingested'; record: JobDescriptionRecord }
  | { status: 'rejected'; reason: string };

export type UpsertJobDescription = (
  record: JobDescriptionRecord,
) => Promise<void>;

export type IngestJobDescriptionDeps = {
  upsertJobDescription: UpsertJobDescription;
};

function optionalString(
  value: unknown,
): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function formatCollectedAt(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    return parsed.toISOString();
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return undefined;
}

export async function ingestJobDescription(
  input: { s3Key: string; body: string },
  deps: IngestJobDescriptionDeps,
): Promise<IngestResult> {
  if (!input.body.startsWith('---')) {
    return {
      status: 'rejected',
      reason: 'Missing YAML frontmatter',
    };
  }

  let data: Record<string, unknown>;
  try {
    ({ data } = matter(input.body) as { data: Record<string, unknown> });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid frontmatter';
    return { status: 'rejected', reason: message };
  }

  const collectedAt = formatCollectedAt(data.collectedAt);
  if (!collectedAt) {
    return {
      status: 'rejected',
      reason: 'Frontmatter requires a valid collectedAt',
    };
  }

  const record: JobDescriptionRecord = {
    id: input.s3Key,
    s3Key: input.s3Key,
    contentHash: createHash('sha256').update(input.body, 'utf8').digest('hex'),
    collectedAt,
    status: 'active',
    title: optionalString(data.title),
    seniority: optionalString(data.seniority),
    roleFamily: optionalString(data.roleFamily),
    source: optionalString(data.source),
  };

  await deps.upsertJobDescription(record);

  return { status: 'ingested', record };
}
