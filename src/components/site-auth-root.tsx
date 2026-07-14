'use client';

import { useMemo, type ReactNode } from 'react';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import type { AmplifyOutputs } from '@/lib/configure-site-amplify';
import { createSiteAuthFromOutputs } from '@/lib/site-auth';

type SiteAuthRootProps = {
  children: ReactNode;
  outputs: AmplifyOutputs | null;
};

export function SiteAuthRoot({ children, outputs }: SiteAuthRootProps) {
  const auth = useMemo(() => createSiteAuthFromOutputs(outputs), [outputs]);

  return <SiteAuthProvider auth={auth}>{children}</SiteAuthProvider>;
}
