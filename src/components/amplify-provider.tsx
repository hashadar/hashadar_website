'use client';

import { useEffect } from 'react';
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
  useEffect(() => {
    configureSiteAmplify(outputs, (config, options) => {
      Amplify.configure(config, options);
    });
  }, [outputs]);

  return children;
}
