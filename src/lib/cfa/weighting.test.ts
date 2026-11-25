import { describe, expect, it } from 'vitest';
import { seededRng, shuffle } from '@/lib/cfa/random';
import {
  allocateByWeight,
  moduleWeights,
  pickWeightedSet,
} from '@/lib/cfa/weighting';
import { makeGroup, makeQuestion, testSyllabus } from '@/test/fixtures/cfa';

describe('allocateByWeight', () => {
  it('splits proportionally to weight', () => {
    const allocation = allocateByWeight(
      { a: 100, b: 100, c: 100 },
      { a: 50, b: 30, c: 20 },
      10,
    );
    expect(allocation).toEqual({ a: 5, b: 3, c: 2 });
  });

  it('never exceeds availability and redistributes the shortfall', () => {
    const allocation = allocateByWeight(
      { a: 1, b: 100, c: 100 },
      { a: 50, b: 30, c: 20 },
      10,
    );
    expect(allocation.a).toBe(1);
    expect(allocation.a + allocation.b + allocation.c).toBe(10);
    expect(allocation.b).toBeGreaterThan(allocation.c);
  });

  it('caps the total at the bank size', () => {
    expect(allocateByWeight({ a: 2, b: 1 }, { a: 1, b: 1 }, 10)).toEqual({
      a: 2,
      b: 1,
    });
  });

  it('skips Modules with no Questions or no weight', () => {
    expect(allocateByWeight({ a: 0, b: 5, c: 5 }, { a: 10, b: 10 }, 4)).toEqual({
      b: 4,
    });
  });

  it('is deterministic on ties', () => {
    expect(allocateByWeight({ a: 5, b: 5 }, { a: 1, b: 1 }, 3)).toEqual({
      a: 2,
      b: 1,
    });
  });
});

describe('moduleWeights', () => {
  it('uses the midpoint of each published range', () => {
    expect(moduleWeights(testSyllabus)).toEqual({
      alpha: 12.5,
      beta: 7.5,
      gamma: 12.5,
    });
  });
});

describe('pickWeightedSet', () => {
  const bank = [
    ...Array.from({ length: 10 }, () => makeQuestion({ module: 'alpha' })),
    ...Array.from({ length: 10 }, () =>
      makeQuestion({ module: 'beta', reading: 'beta-one' }),
    ),
    ...Array.from({ length: 10 }, () =>
      makeQuestion({ module: 'gamma', reading: 'gamma-one' }),
    ),
  ];

  it('returns the requested count weighted across Modules', () => {
    const set = pickWeightedSet(bank, testSyllabus, 13, { rng: seededRng(1) });
    expect(set).toHaveLength(13);
    expect(new Set(set.map((q) => q.id)).size).toBe(13);
    const byModule = set.reduce<Record<string, number>>((acc, q) => {
      acc[q.module] = (acc[q.module] ?? 0) + 1;
      return acc;
    }, {});
    expect(byModule).toEqual({ alpha: 5, beta: 3, gamma: 5 });
  });

  it('prefers Questions attempted least often', () => {
    const alpha = bank.filter((q) => q.module === 'alpha');
    const attemptCounts = Object.fromEntries(
      alpha.map((q, i) => [q.id, i < 8 ? 3 : 0]),
    );
    const set = pickWeightedSet(alpha, testSyllabus, 2, {
      attemptCounts,
      rng: seededRng(7),
    });
    expect(set.map((q) => q.id).sort()).toEqual(
      alpha.slice(8).map((q) => q.id).sort(),
    );
  });
});

describe('pickWeightedSet with Question groups', () => {
  it('takes whole groups but exceeds the total by at most group size − 1', () => {
    const bank = [
      ...makeGroup(3, { module: 'alpha' }),
      ...makeGroup(3, { module: 'alpha' }),
      ...makeGroup(3, { module: 'beta', reading: 'beta-one' }),
      ...makeGroup(3, { module: 'gamma', reading: 'gamma-one' }),
      ...Array.from({ length: 4 }, () => makeQuestion({ module: 'gamma', reading: 'gamma-one' })),
    ];
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const set = pickWeightedSet(bank, testSyllabus, 7, { rng: seededRng(seed) });
      expect(set.length).toBeGreaterThanOrEqual(7);
      expect(set.length).toBeLessThanOrEqual(7 + 2);
      const groupIds = new Set(set.map((q) => q.groupId).filter(Boolean));
      for (const groupId of groupIds) {
        const parts = set.filter((q) => q.groupId === groupId);
        expect(parts).toHaveLength(3);
        const start = set.indexOf(parts[0]);
        expect(set.slice(start, start + 3).map((q) => q.groupOrder)).toEqual([0, 1, 2]);
      }
    }
  });
});

describe('shuffle', () => {
  it('keeps every item and is reproducible with a seed', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const first = shuffle(items, seededRng(3));
    expect([...first].sort()).toEqual(items);
    expect(shuffle(items, seededRng(3))).toEqual(first);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
