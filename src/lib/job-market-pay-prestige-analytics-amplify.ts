import type { GetOwnerPayPrestigeAnalyticsDeps } from './job-market-pay-prestige-analytics';
import { createDefaultAmplifyCorpusDeps } from './job-market-corpus-amplify';
import { createDefaultAmplifyEmployerDeps } from './job-market-employers-amplify';

export type AmplifyPayPrestigeAnalyticsDeps = GetOwnerPayPrestigeAnalyticsDeps;

export function createAmplifyPayPrestigeAnalyticsDeps(
  corpusDeps: Pick<GetOwnerPayPrestigeAnalyticsDeps, 'listJobDescriptions'>,
  employerDeps: Pick<GetOwnerPayPrestigeAnalyticsDeps, 'listEmployers'>,
): AmplifyPayPrestigeAnalyticsDeps {
  return {
    listJobDescriptions: corpusDeps.listJobDescriptions,
    listEmployers: employerDeps.listEmployers,
  };
}

export function createDefaultAmplifyPayPrestigeAnalyticsDeps(): AmplifyPayPrestigeAnalyticsDeps {
  const corpusDeps = createDefaultAmplifyCorpusDeps();
  const employerDeps = createDefaultAmplifyEmployerDeps();
  return createAmplifyPayPrestigeAnalyticsDeps(corpusDeps, employerDeps);
}
