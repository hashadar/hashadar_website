import { createJobOs, type JobOs } from '@/lib/job-os';
import { createDefaultAmplifyJobOsStore } from '@/lib/job-os-amplify';
import { createDefaultJobOsBodyStorage } from '@/lib/job-os-body-storage';
import { createMemoryJobOsBodyStorage } from '@/lib/job-os';
import { createDefaultBedrockFitAnalyser } from '@/lib/job-os-fit-analyser-bedrock';
import { isAmplifyClientConfigured } from '@/lib/is-amplify-client-configured';
import { createFakeFitAnalyser } from '@/lib/job-os-fit-analyser';

let cached: Promise<JobOs> | null = null;

/** Default Amplify-backed Job OS for client UI (lazy singleton). */
export async function getDefaultJobOs(): Promise<JobOs> {
  if (!cached) {
    cached = (async () => {
      const bodies =
        (await createDefaultJobOsBodyStorage()) ??
        createMemoryJobOsBodyStorage();
      const fitAnalyser = isAmplifyClientConfigured()
        ? createDefaultBedrockFitAnalyser()
        : createFakeFitAnalyser();
      return createJobOs({
        store: createDefaultAmplifyJobOsStore(),
        bodies,
        fitAnalyser,
      });
    })();
  }
  return cached;
}
