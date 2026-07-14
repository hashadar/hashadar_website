import type { ClusterSummary, SkillFrequency } from './job-market-lab';
import {
  type CvJdComparisonItem,
  type CvJdComparisonResult,
  type CvJdComparisonTemplates,
} from './compare-cv-to-job-description';
import { shapeCvComparisonResult } from './compare-cv-comparison-shaping';
import { matchTechnologiesInText } from './technology-ontology';

export type CompareCvToMarketInput = {
  cvBody: string;
  technologies: SkillFrequency[];
  themes: ClusterSummary[];
  templates: CvJdComparisonTemplates;
};

function cvMentionsTheme(cvBody: string, label: string): boolean {
  const trimmed = label.trim();
  if (trimmed === '') {
    return false;
  }
  return cvBody.toLowerCase().includes(trimmed.toLowerCase());
}

export function compareCvToMarket(input: CompareCvToMarketInput): CvJdComparisonResult {
  const cvTechnologies = new Set(matchTechnologiesInText(input.cvBody));
  const matches: CvJdComparisonItem[] = [];
  const gaps: CvJdComparisonItem[] = [];

  for (const technology of input.technologies) {
    if (cvTechnologies.has(technology.name)) {
      matches.push({ name: technology.name });
    } else {
      gaps.push({ name: technology.name });
    }
  }

  for (const theme of input.themes) {
    if (theme.size <= 0) {
      continue;
    }

    if (cvMentionsTheme(input.cvBody, theme.label)) {
      matches.push({ name: theme.label });
    } else {
      gaps.push({ name: theme.label });
    }
  }

  return shapeCvComparisonResult(matches, gaps, input.templates);
}
