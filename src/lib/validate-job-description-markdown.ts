import {
  parseJobDescriptionFrontmatter,
} from '@/lib/job-description-frontmatter';

export type JobDescriptionMarkdownValidation =
  | { status: 'valid' }
  | { status: 'rejected'; reason: string };

export function validateJobDescriptionMarkdown(body: string): JobDescriptionMarkdownValidation {
  const parsed = parseJobDescriptionFrontmatter(body);
  if (parsed.status === 'rejected') {
    return parsed;
  }
  return { status: 'valid' };
}
