import { describe, expect, it } from 'vitest';
import {
  findNearDuplicates,
  normaliseStem,
  stemSimilarity,
} from '@/lib/cfa/duplicates';
import { makeGroup, makeQuestion } from '@/test/fixtures/cfa';

const stem =
  'A placeholder widget pays 4.5% a year for five years. Given the table below, which value is closest to the widget price today?';

describe('normaliseStem', () => {
  it('drops maths, Markdown and punctuation but keeps decimals', () => {
    expect(normaliseStem('**Rate:** $r = 4.5\\%$. | Year | Value |')).toBe(
      'rate r 4.5% year value',
    );
  });
});

describe('stemSimilarity', () => {
  it('scores identical wording as 1 regardless of formatting', () => {
    expect(stemSimilarity(stem, `  ${stem.toUpperCase()}  `)).toBe(1);
  });

  it('scores a one-word change in a long stem above the threshold', () => {
    const edited = stem.replace('closest', 'nearest');
    expect(stemSimilarity(stem, edited)).toBeGreaterThan(0.8);
  });

  it('scores unrelated stems low', () => {
    expect(
      stemSimilarity(stem, 'Which placeholder statement about gizmo governance is most accurate?'),
    ).toBeLessThan(0.2);
  });
});

describe('findNearDuplicates', () => {
  const original = makeQuestion({ stem });
  const other = makeQuestion({ stem: 'An unrelated placeholder question about gadgets?' });

  it('finds the near-duplicate and ignores the Question being edited', () => {
    const matches = findNearDuplicates(stem.replace('closest', 'nearest'), [
      original,
      other,
    ]);
    expect(matches.map((match) => match.question.id)).toEqual([original.id]);
    expect(
      findNearDuplicates(stem, [original], { excludeId: original.id }),
    ).toEqual([]);
    expect(findNearDuplicates('   ', [original])).toEqual([]);
  });

  it('ignores sibling parts that share the scenario', () => {
    const [a, b] = makeGroup(2);
    const loose = makeQuestion({ stem: b.stem });
    expect(
      findNearDuplicates(a.stem, [b, loose], { excludeGroupId: a.groupId }).map(
        (match) => match.question.id,
      ),
    ).toEqual([loose.id]);
    // Without the group, siblings would be flagged against each other.
    expect(findNearDuplicates(a.stem, [b]).map((match) => match.question.id)).toEqual([b.id]);
  });
});
