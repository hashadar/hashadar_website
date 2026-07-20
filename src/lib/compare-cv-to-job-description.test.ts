import { describe, expect, it } from 'vitest';
import { compareCvToJobDescription } from './compare-cv-to-job-description';

const defaultTemplates = {
  matchTalkingPoint: 'Prepare a concise example of your {technology} work.',
  gapTalkingPoint:
    'The role emphasises {technology}; explain adjacent experience or your learning plan.',
  gapLearningTarget: 'Build demonstrable {technology} experience for similar roles.',
};

describe('compareCvToJobDescription', () => {
  it('returns ontology-backed matches, gaps, talking points and learning targets', () => {
    const result = compareCvToJobDescription({
      cvBody: 'Built pipelines with Python, SQL, and AWS.',
      jdMarkdown: 'Need Python, Snowflake, and Tableau experience.',
      templates: defaultTemplates,
    });

    expect(result.matches).toEqual([{ name: 'python' }]);
    expect(result.gaps).toEqual([
      { name: 'snowflake' },
      { name: 'tableau' },
    ]);
    expect(result.talkingPoints).toEqual([
      'Prepare a concise example of your python work.',
      'The role emphasises snowflake; explain adjacent experience or your learning plan.',
      'The role emphasises tableau; explain adjacent experience or your learning plan.',
    ]);
    expect(result.learningTargets).toEqual([
      'Build demonstrable snowflake experience for similar roles.',
      'Build demonstrable tableau experience for similar roles.',
    ]);
  });

  it('matches technology aliases once per document side', () => {
    const result = compareCvToJobDescription({
      cvBody: 'Experience with k8s and pyspark.',
      jdMarkdown: 'Looking for kubernetes and Apache Spark.',
      templates: defaultTemplates,
    });

    expect(result.matches).toEqual([
      { name: 'kubernetes' },
      { name: 'spark' },
    ]);
    expect(result.gaps).toEqual([]);
    expect(result.learningTargets).toEqual([]);
  });

  it('returns empty collections when no ontology terms appear in either document', () => {
    const result = compareCvToJobDescription({
      cvBody: 'Strong stakeholder management and communication.',
      jdMarkdown: 'Excellent teamwork and presentation skills required.',
      templates: defaultTemplates,
    });

    expect(result.matches).toEqual([]);
    expect(result.gaps).toEqual([]);
    expect(result.talkingPoints).toEqual([]);
    expect(result.learningTargets).toEqual([]);
  });

  it('treats CV-only technologies as non-gaps', () => {
    const result = compareCvToJobDescription({
      cvBody: 'Databricks and Python delivery.',
      jdMarkdown: 'Python modeller wanted.',
      templates: defaultTemplates,
    });

    expect(result.matches).toEqual([{ name: 'python' }]);
    expect(result.gaps).toEqual([]);
  });
});
