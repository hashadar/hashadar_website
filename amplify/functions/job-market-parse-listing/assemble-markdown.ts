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

export type JobDescriptionSeniority =
  (typeof JOB_DESCRIPTION_SENIORITIES)[number];

export type JobDescriptionRoleFamily =
  (typeof JOB_DESCRIPTION_ROLE_FAMILIES)[number];

export type CompensationPeriod = (typeof COMPENSATION_PERIODS)[number];

export type CompensationDisclosure =
  (typeof COMPENSATION_DISCLOSURES)[number];

export type ExtractedJobDescription = {
  title: string;
  seniority?: JobDescriptionSeniority;
  roleFamily?: JobDescriptionRoleFamily;
  body: string;
  compensationDisclosure?: CompensationDisclosure;
  compensationCurrency?: string;
  compensationMin?: number;
  compensationMax?: number;
  compensationPeriod?: CompensationPeriod;
};

export type AssembleMarkdownInput = ExtractedJobDescription & {
  collectedAt: string;
};

function yamlString(value: string): string {
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

function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
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

function resolveDisclosure(input: {
  compensationDisclosure?: CompensationDisclosure;
  compensationMin?: number;
  compensationMax?: number;
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

export function normaliseExtraction(raw: unknown): ExtractedJobDescription | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title.trim() : '';
  const body = typeof record.body === 'string' ? record.body.trim() : '';
  if (!title || !body) {
    return null;
  }

  const compensationMin = optionalNumber(record.compensationMin);
  const compensationMax = optionalNumber(record.compensationMax);
  const compensationDisclosure = resolveDisclosure({
    compensationDisclosure: optionalEnum(
      record.compensationDisclosure,
      COMPENSATION_DISCLOSURES,
    ),
    compensationMin,
    compensationMax,
  });

  const extraction: ExtractedJobDescription = {
    title,
    body,
    seniority: optionalEnum(record.seniority, JOB_DESCRIPTION_SENIORITIES),
    roleFamily: optionalEnum(record.roleFamily, JOB_DESCRIPTION_ROLE_FAMILIES),
    compensationDisclosure,
  };

  if (compensationDisclosure === 'range') {
    extraction.compensationCurrency = optionalString(record.compensationCurrency);
    extraction.compensationMin = compensationMin;
    extraction.compensationMax = compensationMax;
    extraction.compensationPeriod = optionalEnum(
      record.compensationPeriod,
      COMPENSATION_PERIODS,
    );
  }

  return extraction;
}

/** Assemble YAML frontmatter + body. Omits source for owner HITL tagging. */
export function assembleJobDescriptionMarkdown(input: AssembleMarkdownInput): string {
  const disclosure = resolveDisclosure(input);
  const lines = [
    '---',
    `collectedAt: ${input.collectedAt}`,
    `title: ${yamlString(input.title)}`,
  ];
  if (input.seniority) {
    lines.push(`seniority: ${input.seniority}`);
  }
  if (input.roleFamily) {
    lines.push(`roleFamily: ${input.roleFamily}`);
  }
  lines.push(`compensationDisclosure: ${disclosure}`);
  if (disclosure === 'range') {
    if (input.compensationCurrency) {
      lines.push(
        `compensationCurrency: ${yamlString(input.compensationCurrency)}`,
      );
    }
    if (input.compensationMin !== undefined) {
      lines.push(`compensationMin: ${input.compensationMin}`);
    }
    if (input.compensationMax !== undefined) {
      lines.push(`compensationMax: ${input.compensationMax}`);
    }
    if (input.compensationPeriod) {
      lines.push(`compensationPeriod: ${input.compensationPeriod}`);
    }
  }
  lines.push('---', '', input.body.trim(), '');
  return lines.join('\n');
}

export function slugifyFileName(title: string, collectedAt: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const stamp = collectedAt.replace(/[:.]/g, '-');
  const base = slug || 'listing';
  return `${base}-${stamp}.md`;
}
