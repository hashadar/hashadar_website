import type { JobDescriptionCorpusRecord } from './job-market-corpus';
import { applyMetadataPatchToMarkdown } from './job-description-frontmatter';

export const EMPLOYER_SIZE_TIERS = [
  'startup',
  'scaleup',
  'enterprise',
  'big4',
  'other',
] as const;

export const EMPLOYER_PRESTIGE_TIERS = ['low', 'mid', 'high', 'elite'] as const;

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

export const COMPENSATION_DISCLOSURES = [
  'range',
  'competitive',
  'unknown',
] as const;

export type EmployerSizeTier = (typeof EMPLOYER_SIZE_TIERS)[number];
export type EmployerPrestigeTier = (typeof EMPLOYER_PRESTIGE_TIERS)[number];
export type JobDescriptionSeniority = (typeof JOB_DESCRIPTION_SENIORITIES)[number];
export type JobDescriptionRoleFamily = (typeof JOB_DESCRIPTION_ROLE_FAMILIES)[number];
export type CompensationPeriod = (typeof COMPENSATION_PERIODS)[number];
export type CompensationDisclosure = (typeof COMPENSATION_DISCLOSURES)[number];

/** Readers: competitive wins; valid band numerics → range; else unknown. */
export function resolveCompensationDisclosure(input: {
  compensationDisclosure?: CompensationDisclosure | null;
  compensationMin?: number | null;
  compensationMax?: number | null;
}): CompensationDisclosure {
  if (input.compensationDisclosure === 'competitive') {
    return 'competitive';
  }
  if (input.compensationMin != null && input.compensationMax != null) {
    return 'range';
  }
  if (input.compensationDisclosure === 'range') {
    return 'range';
  }
  return 'unknown';
}

/** Clear numeric pay fields unless disclosure is an explicit range. */
export function clearCompensationRangeFieldsWhenNotRange<
  T extends {
    compensationDisclosure: CompensationDisclosure;
    compensationCurrency?: string | null;
    compensationMin?: number | null;
    compensationMax?: number | null;
    compensationPeriod?: CompensationPeriod | null;
  },
>(fields: T): T {
  if (fields.compensationDisclosure === 'range') {
    return fields;
  }
  return {
    ...fields,
    compensationCurrency: null,
    compensationMin: null,
    compensationMax: null,
    compensationPeriod: null,
  };
}

export type EmployerRecord = {
  id: string;
  name: string;
  sizeTier: EmployerSizeTier;
  prestigeTier: EmployerPrestigeTier;
};

export type CreateEmployerInput = {
  name: string;
  sizeTier: EmployerSizeTier;
  prestigeTier: EmployerPrestigeTier;
};

export type CreateEmployerDeps = {
  insertEmployer: (input: CreateEmployerInput) => Promise<EmployerRecord>;
};

export type CreateEmployerResult =
  | { status: 'created'; employer: EmployerRecord }
  | { status: 'rejected'; reason: string };

export type UpdateEmployerDeps = {
  getEmployer: (id: string) => Promise<EmployerRecord | null>;
  persistEmployer: (record: EmployerRecord) => Promise<void>;
};

export type UpdateEmployerResult =
  | { status: 'updated'; employer: EmployerRecord }
  | { status: 'not_found' }
  | { status: 'rejected'; reason: string };

export type ListEmployersDeps = {
  listEmployers: () => Promise<EmployerRecord[]>;
};

export type JobDescriptionStructuredFieldsPatch = {
  employerId?: string | null;
  seniority?: JobDescriptionSeniority | null;
  roleFamily?: JobDescriptionRoleFamily | null;
  compensationCurrency?: string | null;
  compensationMin?: number | null;
  compensationMax?: number | null;
  compensationPeriod?: CompensationPeriod | null;
  compensationDisclosure?: CompensationDisclosure | null;
};

export type UpdateJobDescriptionStructuredFieldsDeps = {
  getJobDescription: (id: string) => Promise<JobDescriptionCorpusRecord | null>;
  saveJobDescription: (record: JobDescriptionCorpusRecord) => Promise<void>;
  getEmployer: (id: string) => Promise<EmployerRecord | null>;
  /** Load current markdown so metadata can be written into frontmatter (SSOT). */
  getMarkdown: (s3Key: string) => Promise<string | null>;
  overwriteMarkdown: (input: {
    s3Key: string;
    body: string;
  }) => Promise<{ status: 'uploaded'; s3Key: string } | { status: 'rejected'; reason: string }>;
};

export type UpdateJobDescriptionStructuredFieldsResult =
  | { status: 'updated'; record: JobDescriptionCorpusRecord }
  | { status: 'not_found' }
  | { status: 'rejected'; reason: string };

function isEmployerSizeTier(value: string): value is EmployerSizeTier {
  return (EMPLOYER_SIZE_TIERS as readonly string[]).includes(value);
}

function isEmployerPrestigeTier(value: string): value is EmployerPrestigeTier {
  return (EMPLOYER_PRESTIGE_TIERS as readonly string[]).includes(value);
}

function isJobDescriptionSeniority(value: string): value is JobDescriptionSeniority {
  return (JOB_DESCRIPTION_SENIORITIES as readonly string[]).includes(value);
}

function isJobDescriptionRoleFamily(value: string): value is JobDescriptionRoleFamily {
  return (JOB_DESCRIPTION_ROLE_FAMILIES as readonly string[]).includes(value);
}

function isCompensationPeriod(value: string): value is CompensationPeriod {
  return (COMPENSATION_PERIODS as readonly string[]).includes(value);
}

function isCompensationDisclosure(
  value: string,
): value is CompensationDisclosure {
  return (COMPENSATION_DISCLOSURES as readonly string[]).includes(value);
}

function validateEmployerInput(
  input: CreateEmployerInput,
): { status: 'valid' } | { status: 'rejected'; reason: string } {
  if (!input.name.trim()) {
    return { status: 'rejected', reason: 'Employer name is required' };
  }

  if (!isEmployerSizeTier(input.sizeTier)) {
    return { status: 'rejected', reason: 'Unrecognised employer size tier' };
  }

  if (!isEmployerPrestigeTier(input.prestigeTier)) {
    return { status: 'rejected', reason: 'Unrecognised employer prestige tier' };
  }

  return { status: 'valid' };
}

function validateCompensationPatch(
  patch: JobDescriptionStructuredFieldsPatch,
): { status: 'valid' } | { status: 'rejected'; reason: string } {
  if (
    patch.compensationDisclosure != null &&
    patch.compensationDisclosure !== undefined &&
    !isCompensationDisclosure(patch.compensationDisclosure)
  ) {
    return {
      status: 'rejected',
      reason: 'Unrecognised compensation disclosure',
    };
  }

  const disclosure =
    patch.compensationDisclosure === undefined
      ? undefined
      : (patch.compensationDisclosure ?? 'unknown');

  if (disclosure != null && disclosure !== 'range') {
    return { status: 'valid' };
  }

  if (
    patch.compensationMin != null &&
    patch.compensationMax != null &&
    patch.compensationMin > patch.compensationMax
  ) {
    return {
      status: 'rejected',
      reason: 'Compensation minimum cannot exceed maximum',
    };
  }

  if (
    patch.compensationPeriod != null &&
    patch.compensationPeriod !== undefined &&
    !isCompensationPeriod(patch.compensationPeriod)
  ) {
    return { status: 'rejected', reason: 'Unrecognised compensation period' };
  }

  if (
    patch.compensationCurrency != null &&
    patch.compensationCurrency !== undefined &&
    !patch.compensationCurrency.trim()
  ) {
    return { status: 'rejected', reason: 'Compensation currency cannot be blank' };
  }

  return { status: 'valid' };
}

function applyStructuredFieldsPatch(
  existing: JobDescriptionCorpusRecord,
  patch: JobDescriptionStructuredFieldsPatch,
): JobDescriptionCorpusRecord {
  const next: JobDescriptionCorpusRecord = { ...existing };

  if ('employerId' in patch) {
    next.employerId = patch.employerId ?? undefined;
  }
  if ('seniority' in patch) {
    next.seniority = patch.seniority ?? undefined;
  }
  if ('roleFamily' in patch) {
    next.roleFamily = patch.roleFamily ?? undefined;
  }
  if ('compensationCurrency' in patch) {
    next.compensationCurrency = patch.compensationCurrency ?? undefined;
  }
  if ('compensationMin' in patch) {
    next.compensationMin = patch.compensationMin ?? undefined;
  }
  if ('compensationMax' in patch) {
    next.compensationMax = patch.compensationMax ?? undefined;
  }
  if ('compensationPeriod' in patch) {
    next.compensationPeriod = patch.compensationPeriod ?? undefined;
  }
  if ('compensationDisclosure' in patch) {
    next.compensationDisclosure = patch.compensationDisclosure ?? undefined;
  }

  const disclosure = resolveCompensationDisclosure(next);
  next.compensationDisclosure = disclosure;
  if (disclosure !== 'range') {
    next.compensationCurrency = undefined;
    next.compensationMin = undefined;
    next.compensationMax = undefined;
    next.compensationPeriod = undefined;
  }

  return next;
}

export async function createEmployer(
  input: CreateEmployerInput,
  deps: CreateEmployerDeps,
): Promise<CreateEmployerResult> {
  const validation = validateEmployerInput(input);
  if (validation.status === 'rejected') {
    return validation;
  }

  const employer = await deps.insertEmployer({
    name: input.name.trim(),
    sizeTier: input.sizeTier,
    prestigeTier: input.prestigeTier,
  });

  return { status: 'created', employer };
}

export async function updateEmployer(
  input: EmployerRecord,
  deps: UpdateEmployerDeps,
): Promise<UpdateEmployerResult> {
  const existing = await deps.getEmployer(input.id);
  if (!existing) {
    return { status: 'not_found' };
  }

  const validation = validateEmployerInput(input);
  if (validation.status === 'rejected') {
    return validation;
  }

  const employer: EmployerRecord = {
    id: input.id,
    name: input.name.trim(),
    sizeTier: input.sizeTier,
    prestigeTier: input.prestigeTier,
  };
  await deps.persistEmployer(employer);
  return { status: 'updated', employer };
}

export async function listEmployers(deps: ListEmployersDeps): Promise<EmployerRecord[]> {
  return deps.listEmployers();
}

export async function updateJobDescriptionStructuredFields(
  id: string,
  patch: JobDescriptionStructuredFieldsPatch,
  deps: UpdateJobDescriptionStructuredFieldsDeps,
): Promise<UpdateJobDescriptionStructuredFieldsResult> {
  const existing = await deps.getJobDescription(id);
  if (!existing) {
    return { status: 'not_found' };
  }

  if (patch.seniority != null && patch.seniority !== undefined) {
    if (!isJobDescriptionSeniority(patch.seniority)) {
      return { status: 'rejected', reason: 'Unrecognised seniority value' };
    }
  }

  if (patch.roleFamily != null && patch.roleFamily !== undefined) {
    if (!isJobDescriptionRoleFamily(patch.roleFamily)) {
      return { status: 'rejected', reason: 'Unrecognised role family value' };
    }
  }

  const compensationValidation = validateCompensationPatch(patch);
  if (compensationValidation.status === 'rejected') {
    return compensationValidation;
  }

  if (patch.employerId) {
    const employer = await deps.getEmployer(patch.employerId);
    if (!employer) {
      return { status: 'rejected', reason: 'Employer not found' };
    }
  }

  const s3Key = existing.s3Key?.trim();
  if (!s3Key) {
    return { status: 'rejected', reason: 'Job description has no S3 key' };
  }

  const markdown = await deps.getMarkdown(s3Key);
  if (markdown == null) {
    return { status: 'rejected', reason: 'Could not load job description markdown' };
  }

  const merged = applyMetadataPatchToMarkdown(markdown, patch);
  if (merged.status === 'rejected' || !merged.body) {
    return {
      status: 'rejected',
      reason:
        merged.status === 'rejected'
          ? merged.reason
          : 'Could not update frontmatter',
    };
  }

  const upload = await deps.overwriteMarkdown({ s3Key, body: merged.body });
  if (upload.status === 'rejected') {
    return upload;
  }

  // Keep the Amplify projection in sync immediately (ingest will confirm).
  const record = applyStructuredFieldsPatch(existing, patch);
  if (merged.data.title !== undefined) record.title = merged.data.title;
  if (merged.data.source !== undefined) record.source = merged.data.source;
  record.collectedAt = merged.data.collectedAt;
  record.compensationDisclosure = merged.data.compensationDisclosure;
  record.compensationCurrency = merged.data.compensationCurrency;
  record.compensationMin = merged.data.compensationMin;
  record.compensationMax = merged.data.compensationMax;
  record.compensationPeriod = merged.data.compensationPeriod;
  await deps.saveJobDescription(record);
  return { status: 'updated', record };
}
