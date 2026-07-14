import matter from 'gray-matter';

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

export function validateJobDescriptionMarkdown(body: string): JobDescriptionMarkdownValidation {
  if (!body.startsWith('---')) {
    return {
      status: 'rejected',
      reason: 'Missing YAML frontmatter',
    };
  }

  let data: Record<string, unknown>;
  try {
    ({ data } = matter(body) as { data: Record<string, unknown> });
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

  return { status: 'valid' };
}
