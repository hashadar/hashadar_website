import { describe, expect, it } from 'vitest';
import {
  groupIndex,
  partLetter,
  questionGroup,
  shuffleKeepingGroups,
  takeWithGroups,
} from '@/lib/cfa/groups';
import { seededRng, shuffle } from '@/lib/cfa/random';
import { makeGroup, makeQuestion } from '@/test/fixtures/cfa';

const ids = (list: Array<{ id: string }>) => list.map((item) => item.id);

describe('partLetter', () => {
  it('letters parts from a', () => {
    expect([0, 1, 2].map(partLetter)).toEqual(['a', 'b', 'c']);
    expect(partLetter(26)).toBe('27');
  });
});

describe('questionGroup', () => {
  it('lists the parts of a group in order, wherever they sit in the bank', () => {
    const [a, b, c] = makeGroup(3);
    const loose = makeQuestion();
    expect(ids(questionGroup(b, [c, loose, a, b]))).toEqual(ids([a, b, c]));
  });

  it('treats a standalone Question as its own group', () => {
    const loose = makeQuestion();
    expect(questionGroup(loose, [loose, ...makeGroup(2)])).toEqual([loose]);
  });

  it('indexes every group by id', () => {
    const first = makeGroup(2);
    const second = makeGroup(3);
    const index = groupIndex([second[2], makeQuestion(), ...first, second[0], second[1]]);
    expect([...index.keys()].sort()).toEqual(
      [first[0].groupId, second[0].groupId].sort(),
    );
    expect(ids(index.get(second[0].groupId as string) ?? [])).toEqual(ids(second));
  });
});

describe('takeWithGroups', () => {
  it('takes a whole group when it reaches any part, each part counting as one', () => {
    const [a, b, c] = makeGroup(3);
    const x = makeQuestion();
    const y = makeQuestion();
    const groups = groupIndex([a, b, c, x, y]);
    // Reaching part c first still takes a, b, c in order.
    expect(ids(takeWithGroups([x, c, y], 2, groups))).toEqual(ids([x, a, b, c]));
    // Overshoot is at most group size − 1.
    expect(takeWithGroups([x, c, y], 2, groups).length - 2).toBeLessThanOrEqual(2);
    expect(ids(takeWithGroups([x, y, c], 2, groups))).toEqual(ids([x, y]));
  });

  it('skips Questions already taken', () => {
    const [a, b] = makeGroup(2);
    const x = makeQuestion();
    const taken = new Set([x.id]);
    expect(ids(takeWithGroups([x, b, a], 5, groupIndex([a, b]), taken))).toEqual(ids([a, b]));
    expect([...taken].sort()).toEqual([a.id, b.id, x.id].sort());
  });
});

describe('shuffleKeepingGroups', () => {
  it('keeps parts adjacent and in order', () => {
    const group = makeGroup(3);
    const loose = Array.from({ length: 6 }, () => makeQuestion());
    for (const seed of [1, 2, 3, 4, 5]) {
      const result = ids(shuffleKeepingGroups([group[2], ...loose, group[0], group[1]], seededRng(seed)));
      const start = result.indexOf(group[0].id);
      expect(result.slice(start, start + 3)).toEqual(ids(group));
      expect(result).toHaveLength(9);
    }
  });

  it('is a plain shuffle when there are no groups', () => {
    const loose = Array.from({ length: 8 }, () => makeQuestion());
    expect(shuffleKeepingGroups(loose, seededRng(9))).toEqual(shuffle(loose, seededRng(9)));
  });
});
