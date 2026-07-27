import { Amplify } from 'aws-amplify';
import { configureSiteAmplify } from './configure-site-amplify';
import { readAmplifyOutputs } from './read-amplify-outputs';
import { isAmplifyClientConfigured } from './is-amplify-client-configured';

/** Server Components / route handlers: load amplify_outputs.json and configure Amplify. */
export function ensureSiteAmplifyFromOutputs(): void {
  if (isAmplifyClientConfigured()) {
    return;
  }

  configureSiteAmplify(readAmplifyOutputs(), (config, options) => {
    Amplify.configure(config, options);
  });
}
