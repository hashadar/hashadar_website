import { describe, expect, it } from 'vitest';
import { seededRng } from '@/lib/cfa/random';
import {
  buildPracticeSet,
  filterByScope,
  lastCaptureSession,
  mistakesDeck,
} from '@/lib/cfa/sets';
import { timedBudgetSeconds } from '@/lib/cfa/timed';
import {
  makeAttempt,
  makeGroup,
  makeQuestion,
  makeReviewState,
  testSyllabus,
} from '@/test/fixtures/cfa';

describe('filterByScope', () => {
  const a1 = makeQuestion({ module: 'alpha', reading: 'alpha-one', los: 'Outcome X' });
  const a2 = makeQuestion({ module: 'alpha', reading: 'alpha-two', los: 'Outcome Y' });
  const b1 = makeQuestion({ module: 'beta', reading: 'beta-one', los: 'outcome x' });

  it('filters by Module, Reading and LOS', () => {
    expect(filterByScope([a1, a2, b1], { moduleId: 'alpha' })).toEqual([a1, a2]);
    expect(
      filterByScope([a1, a2, b1], { moduleId: 'alpha', readingId: 'alpha-two' }),
    ).toEqual([a2]);
    expect(filterByScope([a1, a2, b1], { los: ' OUTCOME X ' })).toEqual([a1, b1]);
    expect(filterByScope([a1, a2, b1], {})).toHaveLength(3);
  });
});

describe('buildPracticeSet', () => {
  const bank = Array.from({ length: 6 }, () => makeQuestion({ module: 'alpha' }));

  it('takes least-attempted Questions in scope first', () => {
    const attempts = bank.slice(0, 4).map((q) => makeAttempt({ questionId: q.id }));
    const set = buildPracticeSet({
      questions: bank,
      attempts,
      syllabus: testSyllabus,
      scope: { moduleId: 'alpha' },
      weighted: false,
      count: 2,
      rng: seededRng(11),
    });
    expect(set.map((q) => q.id).sort()).toEqual(
      bank.slice(4).map((q) => q.id).sort(),
    );
  });

  it('returns fewer when the scope is small', () => {
    const set = buildPracticeSet({
      questions: bank,
      attempts: [],
      syllabus: testSyllabus,
      scope: { moduleId: 'beta' },
      weighted: false,
      count: 5,
    });
    expect(set).toEqual([]);
  });

  it('uses exam weights for a mixed Set', () => {
    const mixed = [
      ...bank,
      ...Array.from({ length: 6 }, () => makeQuestion({ module: 'beta', reading: 'beta-one' })),
    ];
    const set = buildPracticeSet({
      questions: mixed,
      attempts: [],
      syllabus: testSyllabus,
      scope: { moduleId: 'beta' },
      weighted: true,
      count: 5,
      rng: seededRng(2),
    });
    expect(set).toHaveLength(5);
    expect(set.filter((q) => q.module === 'alpha')).toHaveLength(3);
  });
});

describe('buildPracticeSet with Question groups', () => {
  const ids = (list: Array<{ id: string }>) => list.map((item) => item.id);

  function expectAdjacentInOrder(set: Array<{ id: string }>, group: Array<{ id: string }>) {
    const start = ids(set).indexOf(group[0].id);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(ids(set).slice(start, start + group.length)).toEqual(ids(group));
  }

  it('includes every part of a group it reaches, adjacent and in order', () => {
    const group = makeGroup(3, { module: 'alpha' });
    const loose = Array.from({ length: 4 }, () => makeQuestion({ module: 'alpha' }));
    // Loose Questions were practised, so the group's parts come first.
    const attempts = loose.map((q) => makeAttempt({ questionId: q.id }));
    for (const seed of [1, 2, 3, 4]) {
      const set = buildPracticeSet({
        questions: [...loose, group[2], group[0], group[1]],
        attempts,
        syllabus: testSyllabus,
        scope: { moduleId: 'alpha' },
        weighted: false,
        count: 2,
        rng: seededRng(seed),
      });
      // Requested 2; the whole group of 3 comes, exceeding by group size − 1.
      expect(set).toHaveLength(3);
      expectAdjacentInOrder(set, group);
    }
  });

  it('pulls in parts outside the scope', () => {
    const [a, b] = makeGroup(2, { module: 'alpha', reading: 'alpha-one' });
    const bMoved = { ...b, reading: 'alpha-two' };
    const set = buildPracticeSet({
      questions: [a, bMoved],
      attempts: [],
      syllabus: testSyllabus,
      scope: { moduleId: 'alpha', readingId: 'alpha-one' },
      weighted: false,
      count: 1,
      rng: seededRng(5),
    });
    expect(ids(set)).toEqual([a.id, b.id]);
  });

  it('keeps groups together in a weighted Set and counts each part as one', () => {
    const groups = [makeGroup(3, { module: 'alpha' }), makeGroup(2, { module: 'beta', reading: 'beta-one' })];
    const loose = [
      ...Array.from({ length: 6 }, () => makeQuestion({ module: 'alpha' })),
      ...Array.from({ length: 6 }, () => makeQuestion({ module: 'beta', reading: 'beta-one' })),
      ...Array.from({ length: 6 }, () => makeQuestion({ module: 'gamma', reading: 'gamma-one' })),
    ];
    const bank = [...loose, ...groups.flat()];
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const set = buildPracticeSet({
        questions: bank,
        attempts: [],
        syllabus: testSyllabus,
        scope: {},
        weighted: true,
        count: 8,
        rng: seededRng(seed),
      });
      expect(new Set(ids(set)).size).toBe(set.length);
      expect(set.length).toBeGreaterThanOrEqual(8);
      expect(set.length).toBeLessThanOrEqual(8 + 2);
      for (const group of groups) {
        const taken = group.filter((part) => ids(set).includes(part.id));
        if (taken.length > 0) {
          expect(taken).toHaveLength(group.length);
          expectAdjacentInOrder(set, group);
        }
      }
    }
  });

  it('budgets 90 seconds per part in a Timed Set', () => {
    const group = makeGroup(3);
    const set = buildPracticeSet({
      questions: group,
      attempts: [],
      syllabus: testSyllabus,
      scope: {},
      weighted: false,
      count: 1,
    });
    expect(timedBudgetSeconds(set.length)).toBe(270);
  });

  it('serves only the due parts in the Mistakes deck', () => {
    const [a, b, c] = makeGroup(3);
    const deck = mistakesDeck(
      [a, b, c],
      [
        makeReviewState({ questionId: b.id, dueAt: '2026-11-01T00:00:00.000Z' }),
        makeReviewState({ questionId: c.id, dueAt: '2026-11-20T00:00:00.000Z' }),
      ],
      new Date('2026-11-05T09:00:00Z'),
    );
    expect(ids(deck)).toEqual([b.id]);
  });
});

describe('mistakesDeck', () => {
  it('lists due Questions, most overdue first', () => {
    const q1 = makeQuestion();
    const q2 = makeQuestion();
    const q3 = makeQuestion();
    const deck = mistakesDeck(
      [q1, q2, q3],
      [
        makeReviewState({ questionId: q1.id, dueAt: '2026-11-03T00:00:00.000Z' }),
        makeReviewState({ questionId: q2.id, dueAt: '2026-11-01T00:00:00.000Z' }),
        makeReviewState({ questionId: q3.id, dueAt: '2026-11-20T00:00:00.000Z' }),
        makeReviewState({ questionId: 'gone', dueAt: '2026-10-01T00:00:00.000Z' }),
      ],
      new Date('2026-11-05T09:00:00Z'),
    );
    expect(deck.map((q) => q.id)).toEqual([q2.id, q1.id]);
  });
});

describe('lastCaptureSession', () => {
  it('returns the newest run of Questions added close together, oldest first', () => {
    const old = makeQuestion({ createdAt: '2026-11-01T08:00:00.000Z' });
    const s1 = makeQuestion({ createdAt: '2026-11-02T19:00:00.000Z' });
    const s2 = makeQuestion({ createdAt: '2026-11-02T20:15:00.000Z' });
    const s3 = makeQuestion({ createdAt: '2026-11-02T21:30:00.000Z' });
    expect(lastCaptureSession([s2, old, s3, s1]).map((q) => q.id)).toEqual([
      s1.id,
      s2.id,
      s3.id,
    ]);
  });

  it('breaks the session at a gap longer than the limit', () => {
    const a = makeQuestion({ createdAt: '2026-11-02T08:00:00.000Z' });
    const b = makeQuestion({ createdAt: '2026-11-02T10:00:00.000Z' });
    expect(lastCaptureSession([a, b]).map((q) => q.id)).toEqual([b.id]);
    expect(lastCaptureSession([])).toEqual([]);
  });
});
