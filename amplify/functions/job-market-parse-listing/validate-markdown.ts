/** Lambda-local copy of JD markdown validation (source of truth: src/lib/validate-job-description-markdown.ts). */

export type JobDescriptionMarkdownValidation =
  | { status: 'valid' }
  | { status: 'rejected'; reason: string };

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

function parseFrontmatter(body: string): Record<string, unknown> | null {
  if (!body.startsWith('---')) {
    return null;
  }
  const end = body.indexOf('\n---', 3);
  if (end === -1) {
    return null;
  }
  const yaml = body.slice(4, end).trim();
  const data: Record<string, unknown> = {};
  for (const line of yaml.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    let raw = trimmed.slice(colon + 1).trim();
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      raw = raw.slice(1, -1);
    }
    data[key] = raw;
  }
  return data;
}

export function validateJobDescriptionMarkdown(
  body: string,
): JobDescriptionMarkdownValidation {
  if (!body.startsWith('---')) {
    return { status: 'rejected', reason: 'Missing YAML frontmatter' };
  }

  const data = parseFrontmatter(body);
  if (!data) {
    return { status: 'rejected', reason: 'Invalid frontmatter' };
  }

  const collectedAt = formatCollectedAt(data.collectedAt);
  if (!collectedAt) {
    return {
      status: 'rejected',
      reason: 'Frontmatter requires a valid collectedAt',
    };
  }

  return { status: 'valid' };
}
