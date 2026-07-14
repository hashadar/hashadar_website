import { describe, expect, it } from 'vitest';
import { matchTechnologiesInText } from './technology-ontology';

describe('matchTechnologiesInText', () => {
  it('matches canonical technology names and aliases once per text', () => {
    expect(
      matchTechnologiesInText('We need Python, SQL, and teamwork.'),
    ).toEqual(['python', 'sql']);
    expect(
      matchTechnologiesInText('Looking for Python, Snowflake, and k8s experience.'),
    ).toEqual(['kubernetes', 'python', 'snowflake']);
  });

  it('prefers longer alias matches to avoid overlap', () => {
    expect(
      matchTechnologiesInText('Amazon SageMaker pipelines on AWS.'),
    ).toEqual(['aws', 'sagemaker']);
  });
});
