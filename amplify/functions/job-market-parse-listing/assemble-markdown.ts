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

export type ExtractedJobDescription = {
  title: string;
  seniority?: JobDescriptionSeniority;
  roleFamily?: JobDescriptionRoleFamily;
  body: string;
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

  return {
    title,
    body,
    seniority: optionalEnum(record.seniority, JOB_DESCRIPTION_SENIORITIES),
    roleFamily: optionalEnum(record.roleFamily, JOB_DESCRIPTION_ROLE_FAMILIES),
  };
}

/** Assemble YAML frontmatter + body. Omits source for owner HITL tagging. */
export function assembleJobDescriptionMarkdown(input: AssembleMarkdownInput): string {
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
