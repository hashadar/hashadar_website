import type {
  EmployerRecord,
  HuntProfileRecord,
  OpportunityRecord,
} from '@/lib/job-os';

export type FitAnalyserContext = {
  huntProfile: HuntProfileRecord;
  huntProfileBody: string | null;
  opportunity: OpportunityRecord;
  opportunityBody: string | null;
  employer: EmployerRecord;
  employerBody: string | null;
};

export type FitAnalyserResult = {
  summary: string;
  advantages: string[];
  disadvantages: string[];
  fitNotes: string[];
  gaps: string[];
};

export type FitAnalyser = {
  analyse: (context: FitAnalyserContext) => Promise<FitAnalyserResult>;
};

export function createFakeFitAnalyser(
  result: FitAnalyserResult = {
    summary: 'Synthetic fit summary',
    advantages: ['Advantage'],
    disadvantages: ['Disadvantage'],
    fitNotes: ['Fit note'],
    gaps: ['Gap'],
  },
): FitAnalyser {
  return {
    async analyse() {
      return result;
    },
  };
}

export function parseFitAnalyserResultJson(
  raw: string,
): FitAnalyserResult | null {
  try {
    const parsed = JSON.parse(raw) as Partial<FitAnalyserResult>;
    if (
      typeof parsed.summary !== 'string' ||
      !Array.isArray(parsed.advantages) ||
      !Array.isArray(parsed.disadvantages) ||
      !Array.isArray(parsed.fitNotes) ||
      !Array.isArray(parsed.gaps)
    ) {
      return null;
    }
    return {
      summary: parsed.summary,
      advantages: parsed.advantages.filter(
        (item): item is string => typeof item === 'string',
      ),
      disadvantages: parsed.disadvantages.filter(
        (item): item is string => typeof item === 'string',
      ),
      fitNotes: parsed.fitNotes.filter(
        (item): item is string => typeof item === 'string',
      ),
      gaps: parsed.gaps.filter((item): item is string => typeof item === 'string'),
    };
  } catch {
    return null;
  }
}
