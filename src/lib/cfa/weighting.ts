import { shuffle, type Rng } from '@/lib/cfa/random';
import { weightMidpoint } from '@/lib/cfa/syllabus';
import type { CfaQuestion, CfaSyllabus } from '@/lib/cfa/types';

/**
 * Split `total` Questions across Modules in proportion to their weights,
 * never taking more from a Module than it has available.
 *
 * Uses Sainte-Laguë highest averages (weight / (2 × allocated + 1)), which is
 * proportional and redistributes naturally when a Module runs out. Ties go to
 * the larger weight, then the Module id, so the result is deterministic.
 */
export function allocateByWeight(
  available: Record<string, number>,
  weights: Record<string, number>,
  total: number,
): Record<string, number> {
  const ids = Object.keys(available).filter(
    (id) => (available[id] ?? 0) > 0 && (weights[id] ?? 0) > 0,
  );
  const allocation: Record<string, number> = Object.fromEntries(
    ids.map((id) => [id, 0]),
  );
  const capacity = ids.reduce((sum, id) => sum + available[id], 0);
  const slots = Math.max(0, Math.min(Math.floor(total), capacity));

  for (let slot = 0; slot < slots; slot += 1) {
    let best: string | null = null;
    let bestScore = -Infinity;
    for (const id of ids) {
      if (allocation[id] >= available[id]) continue;
      const score = weights[id] / (2 * allocation[id] + 1);
      const better =
        score > bestScore ||
        (score === bestScore &&
          best !== null &&
          (weights[id] > weights[best] ||
            (weights[id] === weights[best] && id < best)));
      if (best === null || better) {
        best = id;
        bestScore = score;
      }
    }
    if (best === null) break;
    allocation[best] += 1;
  }

  return allocation;
}

/** Module weights (midpoint of each published range) keyed by Module id. */
export function moduleWeights(syllabus: CfaSyllabus): Record<string, number> {
  return Object.fromEntries(
    syllabus.modules.map((module) => [module.id, weightMidpoint(module)]),
  );
}

/**
 * Pick a mixed Set weighted by exam weight. Within each Module, Questions
 * attempted least often come first (ties shuffled), then the whole Set is
 * shuffled so Modules interleave.
 */
export function pickWeightedSet(
  questions: readonly CfaQuestion[],
  syllabus: CfaSyllabus,
  total: number,
  options: { attemptCounts?: Record<string, number>; rng?: Rng } = {},
): CfaQuestion[] {
  const rng = options.rng ?? Math.random;
  const attemptCounts = options.attemptCounts ?? {};
  const byModule = new Map<string, CfaQuestion[]>();
  for (const question of questions) {
    const list = byModule.get(question.module) ?? [];
    list.push(question);
    byModule.set(question.module, list);
  }

  const available = Object.fromEntries(
    [...byModule].map(([id, list]) => [id, list.length]),
  );
  const allocation = allocateByWeight(available, moduleWeights(syllabus), total);

  const picked: CfaQuestion[] = [];
  for (const [moduleId, count] of Object.entries(allocation)) {
    const pool = shuffle(byModule.get(moduleId) ?? [], rng).sort(
      (a, b) => (attemptCounts[a.id] ?? 0) - (attemptCounts[b.id] ?? 0),
    );
    picked.push(...pool.slice(0, count));
  }
  return shuffle(picked, rng);
}
