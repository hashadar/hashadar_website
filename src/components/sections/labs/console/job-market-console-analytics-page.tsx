'use client';

import { JobMarketLabPayPrestigeAnalyticsPanel } from '@/components/sections/labs/job-market-lab-pay-prestige-analytics-panel';
import { JobMarketLabPulseFiltersPanel } from '@/components/sections/labs/job-market-lab-pulse-filters-panel';
import { JobMarketLabThemeLabelsPanel } from '@/components/sections/labs/job-market-lab-theme-labels-panel';

export function JobMarketConsoleAnalyticsPage() {
  return (
    <>
      <JobMarketLabThemeLabelsPanel />
      <JobMarketLabPulseFiltersPanel />
      <JobMarketLabPayPrestigeAnalyticsPanel />
    </>
  );
}
