'use client';

import { Amplify } from 'aws-amplify';
import {
  configureSiteAmplify,
  type AmplifyOutputs,
} from '@/lib/configure-site-amplify';

type AmplifyProviderProps = {
  children: React.ReactNode;
  outputs: AmplifyOutputs | null;
};

export function AmplifyProvider({ children, outputs }: AmplifyProviderProps) {
  // Configure synchronously (not in useEffect) so Storage/Auth signing
  // never races the first client upload after hydration.
  configureSiteAmplify(outputs, (config, options) => {
    Amplify.configure(config, options);
  });

  return children;
}
