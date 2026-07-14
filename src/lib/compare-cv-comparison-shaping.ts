import type {
  CvJdComparisonItem,
  CvJdComparisonResult,
  CvJdComparisonTemplates,
} from './compare-cv-to-job-description';

export function applyComparisonTemplate(template: string, name: string): string {
  return template.replaceAll('{technology}', name);
}

export function shapeCvComparisonResult(
  matches: CvJdComparisonItem[],
  gaps: CvJdComparisonItem[],
  templates: CvJdComparisonTemplates,
): CvJdComparisonResult {
  const talkingPoints = [
    ...matches.map((item) =>
      applyComparisonTemplate(templates.matchTalkingPoint, item.name),
    ),
    ...gaps.map((item) =>
      applyComparisonTemplate(templates.gapTalkingPoint, item.name),
    ),
  ];

  const learningTargets = gaps.map((item) =>
    applyComparisonTemplate(templates.gapLearningTarget, item.name),
  );

  return {
    matches,
    gaps,
    talkingPoints,
    learningTargets,
  };
}
