import type {
  FitAnalyser,
  FitAnalyserContext,
  FitAnalyserResult,
} from '@/lib/job-os-fit-analyser';
import { parseFitAnalyserResultJson } from '@/lib/job-os-fit-analyser';

export type AnalyseFitWithBedrockClient = {
  queries: {
    analyseFitWithBedrock: (input: {
      contextJson: string;
    }) => Promise<{
      data: string | null;
      errors?: Array<{ message: string }> | null;
    }>;
  };
};

export function createBedrockFitAnalyser(
  getClient: () => Promise<AnalyseFitWithBedrockClient>,
): FitAnalyser {
  return {
    async analyse(context: FitAnalyserContext): Promise<FitAnalyserResult> {
      const client = await getClient();
      const { data, errors } = await client.queries.analyseFitWithBedrock({
        contextJson: JSON.stringify(context),
      });
      if (errors?.length) {
        throw new Error(errors.map((error) => error.message).join('; '));
      }
      if (!data) {
        throw new Error('FitAnalyser returned no data');
      }
      const parsed = parseFitAnalyserResultJson(data);
      if (!parsed) {
        throw new Error('FitAnalyser returned invalid JSON');
      }
      return parsed;
    },
  };
}

async function defaultGetClient(): Promise<AnalyseFitWithBedrockClient> {
  const { generateClient } = await import('aws-amplify/data');
  return generateClient() as unknown as AnalyseFitWithBedrockClient;
}

export function createDefaultBedrockFitAnalyser(): FitAnalyser {
  return createBedrockFitAnalyser(defaultGetClient);
}
