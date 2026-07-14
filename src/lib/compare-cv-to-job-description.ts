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

function applyTemplate(template: string, technology: string): string {
  return template.replaceAll('{technology}', technology);
}

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

  const talkingPoints = [
    ...matches.map((item) =>
      applyTemplate(input.templates.matchTalkingPoint, item.name),
    ),
    ...gaps.map((item) =>
      applyTemplate(input.templates.gapTalkingPoint, item.name),
    ),
  ];

  const learningTargets = gaps.map((item) =>
    applyTemplate(input.templates.gapLearningTarget, item.name),
  );

  return {
    matches,
    gaps,
    talkingPoints,
    learningTargets,
  };
}
