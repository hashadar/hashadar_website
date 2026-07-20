'use client';

import { JobMarketAnalyticsWorkspace } from '@/components/sections/labs/console/analytics/job-market-analytics-workspace';
import type {
  GetOwnerPayPrestigeAnalyticsDeps,
  StartJobMarketRecompute,
} from '@/lib/job-market-lab';

export type JobMarketConsoleAnalyticsPageProps = {
  analytics?: GetOwnerPayPrestigeAnalyticsDeps;
  startRecompute?: StartJobMarketRecompute;
};

export function JobMarketConsoleAnalyticsPage({
  analytics,
  startRecompute,
}: JobMarketConsoleAnalyticsPageProps) {
  return (
    <JobMarketAnalyticsWorkspace
      analytics={analytics}
      startRecompute={startRecompute}
    />
  );
}
