import { shapeCvComparisonResult } from './compare-cv-comparison-shaping';
import { matchTechnologiesInText } from './technology-ontology';

export type CvJdComparisonItem = {
  name: string;
};

export type CvJdComparisonTemplates = {
  matchTalkingPoint: string;
  gapTalkingPoint: string;
  gapLearningTarget: string;
};

export type CvJdComparisonResult = {
  matches: CvJdComparisonItem[];
  gaps: CvJdComparisonItem[];
  talkingPoints: string[];
  learningTargets: string[];
};

export type CompareCvToJobDescriptionInput = {
  cvBody: string;
  jdMarkdown: string;
  templates: CvJdComparisonTemplates;
};

export function compareCvToJobDescription(
  input: CompareCvToJobDescriptionInput,
): CvJdComparisonResult {
  const cvTechnologies = new Set(matchTechnologiesInText(input.cvBody));
  const jdTechnologies = matchTechnologiesInText(input.jdMarkdown);

  const matches: CvJdComparisonItem[] = [];
  const gaps: CvJdComparisonItem[] = [];

  for (const name of jdTechnologies) {
    if (cvTechnologies.has(name)) {
      matches.push({ name });
    } else {
      gaps.push({ name });
    }
  }

  return shapeCvComparisonResult(matches, gaps, input.templates);
}
