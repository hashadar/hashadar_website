import { createAmplifyCfaStore, type CfaAmplifyClient } from '@/lib/cfa/amplify-store';
import { createCfaAssist, type CfaAssist } from '@/lib/cfa/assist';
import {
  createAmplifyCfaScreenshotStorage,
  type AmplifyStorageApi,
  type CfaScreenshotStorage,
} from '@/lib/cfa/screenshots';
import { createCfaService, type CfaService } from '@/lib/cfa/service';
import { isAmplifyClientConfigured } from '@/lib/is-amplify-client-configured';

export type CfaLab = {
  service: CfaService;
  screenshots: CfaScreenshotStorage;
  assist: CfaAssist;
};

type StartCfaAssistClient = {
  mutations: {
    startCfaAssist: (input: {
      jobId: string;
      task: string;
      screenshotKeys: string[];
      contextJson: string;
    }) => Promise<{ data: unknown; errors?: Array<{ message: string }> | null }>;
  };
};

let cached: CfaLab | null | undefined;

function createAmplifyCfaLab(): CfaLab {
  let clientPromise: Promise<CfaAmplifyClient & StartCfaAssistClient> | null = null;
  const getClient = () => {
    clientPromise ??= import('aws-amplify/data').then(
      ({ generateClient }) =>
        generateClient() as unknown as CfaAmplifyClient & StartCfaAssistClient,
    );
    return clientPromise;
  };
  const screenshots = createAmplifyCfaScreenshotStorage(
    () => import('aws-amplify/storage') as unknown as Promise<AmplifyStorageApi>,
  );
  const assist = createCfaAssist({
    async startJob(input) {
      const client = await getClient();
      const { errors } = await client.mutations.startCfaAssist(input);
      if (errors?.length) {
        throw new Error(errors.map((error) => error.message).join('; '));
      }
    },
    readText: (key) => screenshots.readText(key),
    remove: (key) => screenshots.remove(key),
  });
  return {
    service: createCfaService({ store: createAmplifyCfaStore(getClient), screenshots }),
    screenshots,
    assist,
  };
}

/**
 * Default CFA Lab wiring for client UI (lazy singleton): Amplify Data and
 * Storage, or null when the build has no Amplify outputs.
 */
export function getDefaultCfaLab(): CfaLab | null {
  if (cached !== undefined) return cached;
  cached = isAmplifyClientConfigured() ? createAmplifyCfaLab() : null;
  return cached;
}
