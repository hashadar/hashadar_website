import type { Metadata } from 'next';
import { JobMarketConsoleAnalyticsPage } from '@/components/sections/labs/console/job-market-console-analytics-page';
import { getPageData, site } from '@/data';

const jobMarketLab = getPageData('/labs/job-market');
const navItem = jobMarketLab.console.nav.items.find((item) => item.id === 'analytics');

export const metadata: Metadata = {
  title: `${navItem?.label ?? 'Analytics'} - ${jobMarketLab.console.heading} - ${site.metadata.author}`,
  description: navItem?.description ?? jobMarketLab.console.description,
  robots: {
    index: false,
    follow: false,
  },
};

export default function JobMarketLabConsoleAnalyticsRoute() {
  return <JobMarketConsoleAnalyticsPage />;
}
