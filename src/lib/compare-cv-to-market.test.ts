import { describe, expect, it } from 'vitest';
import { compareCvToMarket } from './compare-cv-to-market';

const defaultTemplates = {
  matchTalkingPoint: 'Your CV aligns with current market demand for {technology}.',
  gapTalkingPoint:
    'Market demand highlights {technology}; explain adjacent experience or your learning plan.',
  gapLearningTarget:
    'Build demonstrable {technology} experience to reflect current market demand.',
};

describe('compareCvToMarket', () => {
  it('returns ontology-backed technology matches, gaps, talking points and learning targets', () => {
    const result = compareCvToMarket({
      cvBody: 'Built pipelines with Python, SQL, and AWS.',
      technologies: [
        { name: 'python', count: 9 },
        { name: 'snowflake', count: 6 },
        { name: 'tableau', count: 4 },
      ],
      themes: [],
      templates: defaultTemplates,
    });

    expect(result.matches).toEqual([{ name: 'python' }]);
    expect(result.gaps).toEqual([
      { name: 'snowflake' },
      { name: 'tableau' },
    ]);
    expect(result.talkingPoints).toEqual([
      'Your CV aligns with current market demand for python.',
      'Market demand highlights snowflake; explain adjacent experience or your learning plan.',
      'Market demand highlights tableau; explain adjacent experience or your learning plan.',
    ]);
    expect(result.learningTargets).toEqual([
      'Build demonstrable snowflake experience to reflect current market demand.',
      'Build demonstrable tableau experience to reflect current market demand.',
    ]);
  });

  it('includes active requirement themes in matches and gaps', () => {
    const result = compareCvToMarket({
      cvBody: 'Delivered model governance and Python analytics.',
      technologies: [{ name: 'python', count: 5 }],
      themes: [
        { id: 0, size: 7, label: 'Model governance' },
        { id: 1, size: 4, label: 'Cloud platform engineering' },
      ],
      templates: defaultTemplates,
    });

    expect(result.matches).toEqual([
      { name: 'python' },
      { name: 'Model governance' },
    ]);
    expect(result.gaps).toEqual([{ name: 'Cloud platform engineering' }]);
  });

  it('ignores themes with zero document count', () => {
    const result = compareCvToMarket({
      cvBody: 'Python delivery.',
      technologies: [{ name: 'python', count: 3 }],
      themes: [{ id: 0, size: 0, label: 'Inactive theme' }],
      templates: defaultTemplates,
    });

    expect(result.matches).toEqual([{ name: 'python' }]);
    expect(result.gaps).toEqual([]);
  });

  it('returns empty collections when market demand has no technologies or themes', () => {
    const result = compareCvToMarket({
      cvBody: 'Python and SQL delivery.',
      technologies: [],
      themes: [],
      templates: defaultTemplates,
    });

    expect(result.matches).toEqual([]);
    expect(result.gaps).toEqual([]);
    expect(result.talkingPoints).toEqual([]);
    expect(result.learningTargets).toEqual([]);
  });
});
