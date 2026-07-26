import { Amplify } from 'aws-amplify';

/** True when Amplify.getConfig() has been populated (outputs loaded). */
export function isAmplifyClientConfigured(
  getConfig: () => object = () => Amplify.getConfig(),
): boolean {
  return Object.keys(getConfig()).length > 0;
}
