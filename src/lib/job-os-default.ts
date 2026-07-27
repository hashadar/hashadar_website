import { createJobOs, type JobOs } from '@/lib/job-os';
import { createDefaultAmplifyJobOsStore } from '@/lib/job-os-amplify';
import { createDefaultJobOsBodyStorage } from '@/lib/job-os-body-storage';
import { createMemoryJobOsBodyStorage } from '@/lib/job-os';

let cached: Promise<JobOs> | null = null;

/** Default Amplify-backed Job OS for client UI (lazy singleton). */
export async function getDefaultJobOs(): Promise<JobOs> {
  if (!cached) {
    cached = (async () => {
      const bodies =
        (await createDefaultJobOsBodyStorage()) ??
        createMemoryJobOsBodyStorage();
      return createJobOs({
        store: createDefaultAmplifyJobOsStore(),
        bodies,
      });
    })();
  }
  return cached;
}
