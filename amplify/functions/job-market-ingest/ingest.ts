import { createHash } from 'node:crypto';
import matter from 'gray-matter';

export type JobDescriptionStatus = 'active' | 'archived';

export const JOB_DESCRIPTION_SENIORITIES = [
  'junior',
  'mid',
  'senior',
  'lead',
  'principal',
] as const;

export const JOB_DESCRIPTION_ROLE_FAMILIES = [
  'data_science',
  'analytics',
  'engineering',
  'ml_ops',
  'product',
  'other',
] as const;

export type JobDescriptionSeniority =
  (typeof JOB_DESCRIPTION_SENIORITIES)[number];

export type JobDescriptionRoleFamily =
  (typeof JOB_DESCRIPTION_ROLE_FAMILIES)[number];

/** Frontmatter may still use kebab-case; map to GraphQL-safe enum values. */
const ROLE_FAMILY_ALIASES: Record<string, JobDescriptionRoleFamily> = {
  'data-science': 'data_science',
  'ml-ops': 'ml_ops',
};

export type JobDescriptionRecord = {
  id: string;
  s3Key: string;
  contentHash: string;
  collectedAt: string;
  status: JobDescriptionStatus;
  title?: string;
  seniority?: JobDescriptionSeniority;
  roleFamily?: JobDescriptionRoleFamily;
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

function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof value === 'string' &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

function optionalRoleFamily(value: unknown): JobDescriptionRoleFamily | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }
  return (
    optionalEnum(value, JOB_DESCRIPTION_ROLE_FAMILIES) ??
    ROLE_FAMILY_ALIASES[value]
  );
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
    seniority: optionalEnum(data.seniority, JOB_DESCRIPTION_SENIORITIES),
    roleFamily: optionalRoleFamily(data.roleFamily),
    source: optionalString(data.source),
  };

  await deps.upsertJobDescription(record);

  return { status: 'ingested', record };
}
