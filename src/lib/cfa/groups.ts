import { shuffle, type Rng } from '@/lib/cfa/random';
import type { CfaQuestion } from '@/lib/cfa/types';

/**
 * Question groups (docs/cfa/CONTEXT.md): the parts of one multi-part question
 * (1a, 1b, 1c) share a `groupId` and are ordered by `groupOrder`. Each part is
 * a full Question whose stem repeats the shared scenario.
 */

type GroupFields = Pick<CfaQuestion, 'id' | 'groupId' | 'groupOrder' | 'createdAt'>;

/** Default part label for the part at `index` (0 → "a"). */
export function partLetter(index: number): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  return letters[index] ?? String(index + 1);
}

/** Order parts within a group: `groupOrder`, then creation time, then id. */
export function compareGroupOrder(a: GroupFields, b: GroupFields): number {
  const orderA = a.groupOrder ?? Number.POSITIVE_INFINITY;
  const orderB = b.groupOrder ?? Number.POSITIVE_INFINITY;
  if (orderA !== orderB) return orderA < orderB ? -1 : 1;
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

/** Every group in the bank, keyed by `groupId`, parts in order. */
export function groupIndex<T extends GroupFields>(
  questions: readonly T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const question of questions) {
    if (!question.groupId) continue;
    const list = groups.get(question.groupId) ?? [];
    list.push(question);
    groups.set(question.groupId, list);
  }
  for (const list of groups.values()) list.sort(compareGroupOrder);
  return groups;
}

/** The parts of `question`'s group in order (itself included); `[question]` when standalone. */
export function questionGroup<T extends GroupFields>(
  question: T,
  questions: readonly T[],
): T[] {
  if (!question.groupId) return [question];
  const parts = questions
    .filter((item) => item.groupId === question.groupId)
    .sort(compareGroupOrder);
  return parts.some((item) => item.id === question.id) ? parts : [question, ...parts];
}

/**
 * Take Questions from `ordered` until at least `count` are taken. Reaching any
 * part of a group takes the whole group, in order (from `groups`, so parts
 * outside `ordered` come too). Each part counts as one Question, so the result
 * can exceed `count` by up to group size − 1. Ids in `taken` are skipped and
 * every Question taken is added to it.
 */
export function takeWithGroups<T extends GroupFields>(
  ordered: readonly T[],
  count: number,
  groups: ReadonlyMap<string, readonly T[]>,
  taken: Set<string> = new Set(),
): T[] {
  const result: T[] = [];
  for (const question of ordered) {
    if (result.length >= count) break;
    if (taken.has(question.id)) continue;
    const unit = (question.groupId && groups.get(question.groupId)) || [question];
    for (const part of unit) {
      if (taken.has(part.id)) continue;
      taken.add(part.id);
      result.push(part);
    }
  }
  return result;
}

/**
 * Shuffle a Set while keeping each group's parts adjacent and in order.
 * Without groups this is exactly `shuffle(questions, rng)`.
 */
export function shuffleKeepingGroups<T extends GroupFields>(
  questions: readonly T[],
  rng: Rng = Math.random,
): T[] {
  const blocks: T[][] = [];
  const blockByGroup = new Map<string, T[]>();
  for (const question of questions) {
    const existing = question.groupId ? blockByGroup.get(question.groupId) : undefined;
    if (existing) {
      existing.push(question);
      continue;
    }
    const block = [question];
    blocks.push(block);
    if (question.groupId) blockByGroup.set(question.groupId, block);
  }
  for (const block of blocks) block.sort(compareGroupOrder);
  return shuffle(blocks, rng).flat();
}
