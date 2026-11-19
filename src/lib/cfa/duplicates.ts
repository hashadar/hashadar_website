import type { CfaQuestion } from '@/lib/cfa/types';

/** Stems at or above this similarity are flagged as near-duplicates. */
export const NEAR_DUPLICATE_THRESHOLD = 0.8;

/**
 * Comparable form of a stem: lower case, maths delimiters and Markdown
 * punctuation removed, KaTeX commands reduced to their names, whitespace collapsed.
 * Numbers are kept, so the same wording with different figures scores just below 1.
 */
export function normaliseStem(stem: string): string {
  return stem
    .toLowerCase()
    .replace(/\\%/g, '%')
    .replace(/\\([a-z]+)/g, ' $1 ')
    .replace(/[^a-z0-9\s.%]/g, ' ')
    .split(/\s+/)
    // Keep decimal points (4.5) but drop sentence full stops.
    .map((word) => word.replace(/^\.+|\.+$/g, ''))
    .filter(Boolean)
    .join(' ');
}

function tokens(stem: string): string[] {
  return normaliseStem(stem).split(' ').filter(Boolean);
}

/** Word bigrams (unigrams for one-word stems). */
export function shingles(stem: string): Set<string> {
  const words = tokens(stem);
  if (words.length < 2) return new Set(words);
  const result = new Set<string>();
  for (let i = 0; i < words.length - 1; i += 1) {
    result.add(`${words[i]} ${words[i + 1]}`);
  }
  return result;
}

/** Jaccard similarity of word bigrams, in [0, 1]. */
export function stemSimilarity(a: string, b: string): number {
  const left = shingles(a);
  const right = shingles(b);
  if (left.size === 0 && right.size === 0) return 0;
  let shared = 0;
  for (const item of left) if (right.has(item)) shared += 1;
  return shared / (left.size + right.size - shared);
}

export type DuplicateMatch = {
  question: CfaQuestion;
  similarity: number;
};

export function findNearDuplicates(
  stem: string,
  questions: readonly CfaQuestion[],
  options: { threshold?: number; excludeId?: string | null; limit?: number } = {},
): DuplicateMatch[] {
  const threshold = options.threshold ?? NEAR_DUPLICATE_THRESHOLD;
  if (!stem.trim()) return [];
  return questions
    .filter((question) => question.id !== options.excludeId)
    .map((question) => ({
      question,
      similarity: stemSimilarity(stem, question.stem),
    }))
    .filter((match) => match.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, options.limit ?? 3);
}
