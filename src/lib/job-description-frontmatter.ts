import matter from 'gray-matter';
import {
  COMPENSATION_DISCLOSURES,
  COMPENSATION_PERIODS,
  JOB_DESCRIPTION_ROLE_FAMILIES,
  JOB_DESCRIPTION_SENIORITIES,
  resolveCompensationDisclosure,
  type CompensationDisclosure,
  type CompensationPeriod,
  type JobDescriptionRoleFamily,
  type JobDescriptionSeniority,
} from '@/lib/job-market-employers';

/** Canonical YAML keys for JD markdown. Model fields are a projection of these. */
export const JOB_DESCRIPTION_FRONTMATTER_KEYS = [
  'collectedAt',
  'title',
  'seniority',
  'roleFamily',
  'source',
  'employerId',
  'compensationCurrency',
  'compensationMin',
  'compensationMax',
  'compensationPeriod',
  'compensationDisclosure',
] as const;

export type JobDescriptionFrontmatterKey =
  (typeof JOB_DESCRIPTION_FRONTMATTER_KEYS)[number];

export type JobDescriptionFrontmatter = {
  collectedAt: string;
  title?: string;
  seniority?: JobDescriptionSeniority;
  roleFamily?: JobDescriptionRoleFamily;
  source?: string;
  employerId?: string;
  compensationCurrency?: string;
  compensationMin?: number;
  compensationMax?: number;
  compensationPeriod?: CompensationPeriod;
  compensationDisclosure?: CompensationDisclosure;
};

export type ParseFrontmatterResult =
  | { status: 'ok'; data: JobDescriptionFrontmatter; content: string }
  | { status: 'rejected'; reason: string };

export type EmployerRegistryCheck =
  | { status: 'ok' }
  | { status: 'unset' }
  | { status: 'unknown'; employerId: string };

const ROLE_FAMILY_ALIASES: Record<string, JobDescriptionRoleFamily> = {
  'data-science': 'data_science',
  'ml-ops': 'ml_ops',
};

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
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

function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
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

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function yamlScalar(value: string | number): string {
  if (typeof value === 'number') {
    return String(value);
  }
  if (
    value === '' ||
    /[:#{}[\],&*?|>!%@`]/.test(value) ||
    value.includes('\n') ||
    value.includes('"') ||
    value.includes("'") ||
    /^\s|\s$/.test(value)
  ) {
    return JSON.stringify(value);
  }
  return value;
}

function normaliseCompensationFrontmatter(input: {
  compensationDisclosure?: CompensationDisclosure;
  compensationCurrency?: string;
  compensationMin?: number;
  compensationMax?: number;
  compensationPeriod?: CompensationPeriod;
}): Pick<
  JobDescriptionFrontmatter,
  | 'compensationDisclosure'
  | 'compensationCurrency'
  | 'compensationMin'
  | 'compensationMax'
  | 'compensationPeriod'
> {
  const compensationDisclosure = resolveCompensationDisclosure({
    compensationDisclosure: input.compensationDisclosure,
    compensationMin: input.compensationMin,
    compensationMax: input.compensationMax,
  });

  if (compensationDisclosure !== 'range') {
    return { compensationDisclosure };
  }

  return {
    compensationDisclosure,
    compensationCurrency: input.compensationCurrency,
    compensationMin: input.compensationMin,
    compensationMax: input.compensationMax,
    compensationPeriod: input.compensationPeriod,
  };
}

/** Parse and normalise JD frontmatter. Invalid enum values are dropped. */
export function parseJobDescriptionFrontmatter(body: string): ParseFrontmatterResult {
  if (!body.startsWith('---')) {
    return { status: 'rejected', reason: 'Missing YAML frontmatter' };
  }

  let data: Record<string, unknown>;
  let content: string;
  try {
    const parsed = matter(body) as { data: Record<string, unknown>; content: string };
    data = parsed.data;
    content = parsed.content;
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
    compensationMin !== undefined &&
    compensationMax !== undefined &&
    compensationMin > compensationMax
  ) {
    return {
      status: 'rejected',
      reason: 'compensationMin must be less than or equal to compensationMax',
    };
  }

  const compensation = normaliseCompensationFrontmatter({
    compensationDisclosure: optionalEnum(
      data.compensationDisclosure,
      COMPENSATION_DISCLOSURES,
    ),
    compensationCurrency: optionalString(data.compensationCurrency),
    compensationMin,
    compensationMax,
    compensationPeriod: optionalEnum(data.compensationPeriod, COMPENSATION_PERIODS),
  });

  if (
    compensation.compensationDisclosure === 'range' &&
    compensation.compensationMin !== undefined &&
    compensation.compensationMax !== undefined &&
    compensation.compensationMin > compensation.compensationMax
  ) {
    return {
      status: 'rejected',
      reason: 'compensationMin must be less than or equal to compensationMax',
    };
  }

  return {
    status: 'ok',
    content,
    data: {
      collectedAt,
      title: optionalString(data.title),
      seniority: optionalEnum(data.seniority, JOB_DESCRIPTION_SENIORITIES),
      roleFamily: optionalRoleFamily(data.roleFamily),
      source: optionalString(data.source),
      employerId: optionalString(data.employerId),
      ...compensation,
    },
  };
}

export function serializeJobDescriptionFrontmatter(
  data: JobDescriptionFrontmatter,
  content: string,
): string {
  const compensation = normaliseCompensationFrontmatter(data);
  const lines = ['---', `collectedAt: ${data.collectedAt}`];
  if (data.title) lines.push(`title: ${yamlScalar(data.title)}`);
  if (data.seniority) lines.push(`seniority: ${data.seniority}`);
  if (data.roleFamily) lines.push(`roleFamily: ${data.roleFamily}`);
  if (data.source) lines.push(`source: ${yamlScalar(data.source)}`);
  if (data.employerId) lines.push(`employerId: ${yamlScalar(data.employerId)}`);
  lines.push(`compensationDisclosure: ${compensation.compensationDisclosure}`);
  if (compensation.compensationCurrency) {
    lines.push(
      `compensationCurrency: ${yamlScalar(compensation.compensationCurrency)}`,
    );
  }
  if (compensation.compensationMin !== undefined) {
    lines.push(`compensationMin: ${yamlScalar(compensation.compensationMin)}`);
  }
  if (compensation.compensationMax !== undefined) {
    lines.push(`compensationMax: ${yamlScalar(compensation.compensationMax)}`);
  }
  if (compensation.compensationPeriod) {
    lines.push(`compensationPeriod: ${compensation.compensationPeriod}`);
  }
  lines.push('---', '', content.replace(/^\n+/, '').trimEnd(), '');
  return lines.join('\n');
}

export type FrontmatterMetadataPatch = {
  title?: string | null;
  source?: string | null;
  collectedAt?: string | null;
  employerId?: string | null;
  seniority?: JobDescriptionSeniority | null;
  roleFamily?: JobDescriptionRoleFamily | null;
  compensationCurrency?: string | null;
  compensationMin?: number | null;
  compensationMax?: number | null;
  compensationPeriod?: CompensationPeriod | null;
  compensationDisclosure?: CompensationDisclosure | null;
};

function applyPatch(
  existing: JobDescriptionFrontmatter,
  patch: FrontmatterMetadataPatch,
): JobDescriptionFrontmatter {
  const next: JobDescriptionFrontmatter = { ...existing };

  if ('title' in patch) next.title = optionalString(patch.title) ?? undefined;
  if ('source' in patch) next.source = optionalString(patch.source) ?? undefined;
  if ('collectedAt' in patch) {
    const collectedAt = formatCollectedAt(patch.collectedAt);
    if (collectedAt) next.collectedAt = collectedAt;
  }
  if ('employerId' in patch) {
    next.employerId = optionalString(patch.employerId) ?? undefined;
  }
  if ('seniority' in patch) next.seniority = patch.seniority ?? undefined;
  if ('roleFamily' in patch) next.roleFamily = patch.roleFamily ?? undefined;
  if ('compensationCurrency' in patch) {
    next.compensationCurrency =
      optionalString(patch.compensationCurrency) ?? undefined;
  }
  if ('compensationMin' in patch) {
    next.compensationMin =
      patch.compensationMin === null || patch.compensationMin === undefined
        ? undefined
        : patch.compensationMin;
  }
  if ('compensationMax' in patch) {
    next.compensationMax =
      patch.compensationMax === null || patch.compensationMax === undefined
        ? undefined
        : patch.compensationMax;
  }
  if ('compensationPeriod' in patch) {
    next.compensationPeriod = patch.compensationPeriod ?? undefined;
  }
  if ('compensationDisclosure' in patch) {
    next.compensationDisclosure = patch.compensationDisclosure ?? undefined;
  }

  return {
    ...next,
    ...normaliseCompensationFrontmatter(next),
  };
}

/** Merge metadata into markdown frontmatter (SSOT write). */
export function applyMetadataPatchToMarkdown(
  body: string,
  patch: FrontmatterMetadataPatch,
): ParseFrontmatterResult & { body?: string } {
  const parsed = parseJobDescriptionFrontmatter(body);
  if (parsed.status === 'rejected') {
    return parsed;
  }
  const next = applyPatch(parsed.data, patch);
  if (
    next.compensationDisclosure === 'range' &&
    next.compensationMin !== undefined &&
    next.compensationMax !== undefined &&
    next.compensationMin > next.compensationMax
  ) {
    return {
      status: 'rejected',
      reason: 'compensationMin must be less than or equal to compensationMax',
    };
  }
  return {
    status: 'ok',
    data: next,
    content: parsed.content,
    body: serializeJobDescriptionFrontmatter(next, parsed.content),
  };
}

/**
 * Merge model projection fields into markdown when YAML is missing them,
 * so the editor shows a complete frontmatter before save.
 */
export function mergeModelFieldsIntoMarkdown(
  body: string,
  model: FrontmatterMetadataPatch & { collectedAt?: string },
): string {
  const parsed = parseJobDescriptionFrontmatter(body);
  if (parsed.status === 'rejected') {
    return body;
  }

  const patch: FrontmatterMetadataPatch = {};
  if (!parsed.data.title && model.title) patch.title = model.title;
  if (!parsed.data.source && model.source) patch.source = model.source;
  if (!parsed.data.employerId && model.employerId) patch.employerId = model.employerId;
  if (!parsed.data.seniority && model.seniority) patch.seniority = model.seniority;
  if (!parsed.data.roleFamily && model.roleFamily) patch.roleFamily = model.roleFamily;
  if (
    (parsed.data.compensationDisclosure === undefined ||
      parsed.data.compensationDisclosure === 'unknown') &&
    model.compensationDisclosure &&
    model.compensationDisclosure !== 'unknown'
  ) {
    patch.compensationDisclosure = model.compensationDisclosure;
  }
  if (!parsed.data.compensationCurrency && model.compensationCurrency) {
    patch.compensationCurrency = model.compensationCurrency;
  }
  if (parsed.data.compensationMin === undefined && model.compensationMin != null) {
    patch.compensationMin = model.compensationMin;
  }
  if (parsed.data.compensationMax === undefined && model.compensationMax != null) {
    patch.compensationMax = model.compensationMax;
  }
  if (!parsed.data.compensationPeriod && model.compensationPeriod) {
    patch.compensationPeriod = model.compensationPeriod;
  }

  // Infer range when merging a complete numeric band without an explicit disclosure.
  if (
    patch.compensationMin != null &&
    patch.compensationMax != null &&
    !patch.compensationDisclosure &&
    (parsed.data.compensationDisclosure === undefined ||
      parsed.data.compensationDisclosure === 'unknown')
  ) {
    patch.compensationDisclosure = 'range';
  }

  if (Object.keys(patch).length === 0) {
    return body;
  }

  const merged = applyMetadataPatchToMarkdown(body, patch);
  return merged.status === 'ok' && merged.body ? merged.body : body;
}

export function checkEmployerInRegistry(
  employerId: string | undefined,
  knownIds: ReadonlySet<string> | Iterable<string>,
): EmployerRegistryCheck {
  if (!employerId?.trim()) {
    return { status: 'unset' };
  }
  const id = employerId.trim();
  const set = knownIds instanceof Set ? knownIds : new Set(knownIds);
  if (!set.has(id)) {
    return { status: 'unknown', employerId: id };
  }
  return { status: 'ok' };
}
