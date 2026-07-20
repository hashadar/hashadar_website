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

export const COMPENSATION_PERIODS = ['year', 'month', 'day', 'hour'] as const;

export type JobDescriptionSeniority =
  (typeof JOB_DESCRIPTION_SENIORITIES)[number];

export type JobDescriptionRoleFamily =
  (typeof JOB_DESCRIPTION_ROLE_FAMILIES)[number];

export type CompensationPeriod = (typeof COMPENSATION_PERIODS)[number];

/** Frontmatter may still use kebab-case; map to GraphQL-safe enum values. */
const ROLE_FAMILY_ALIASES: Record<string, JobDescriptionRoleFamily> = {
  'data-science': 'data_science',
  'ml-ops': 'ml_ops',
};

/**
 * Projection of YAML frontmatter onto the JobDescription model.
 * Optional fields use null when absent so upserts clear stale DB values (SSOT).
 */
export type JobDescriptionRecord = {
  id: string;
  s3Key: string;
  contentHash: string;
  collectedAt: string;
  status: JobDescriptionStatus;
  title: string | null;
  seniority: JobDescriptionSeniority | null;
  roleFamily: JobDescriptionRoleFamily | null;
  source: string | null;
  employerId: string | null;
  compensationCurrency: string | null;
  compensationMin: number | null;
  compensationMax: number | null;
  compensationPeriod: CompensationPeriod | null;
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

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function optionalRoleFamily(value: unknown): JobDescriptionRoleFamily | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  return (
    optionalEnum(value, JOB_DESCRIPTION_ROLE_FAMILIES) ??
    ROLE_FAMILY_ALIASES[value] ??
    null
  );
}

function optionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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

  const compensationMin = optionalNumber(data.compensationMin);
  const compensationMax = optionalNumber(data.compensationMax);
  if (
    compensationMin !== null &&
    compensationMax !== null &&
    compensationMin > compensationMax
  ) {
    return {
      status: 'rejected',
      reason: 'compensationMin must be less than or equal to compensationMax',
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
    employerId: optionalString(data.employerId),
    compensationCurrency: optionalString(data.compensationCurrency),
    compensationMin,
    compensationMax,
    compensationPeriod: optionalEnum(data.compensationPeriod, COMPENSATION_PERIODS),
  };

  await deps.upsertJobDescription(record);

  return { status: 'ingested', record };
}
