import type { Metadata } from 'next';
import { JobMarketConsoleRunsPage } from '@/components/sections/labs/console/job-market-console-runs-page';
import { getPageData, site } from '@/data';

const jobMarketLab = getPageData('/labs/job-market');
const navItem = jobMarketLab.console.nav.items.find((item) => item.id === 'runs');

export const metadata: Metadata = {
  title: `${navItem?.label ?? 'Runs'} - ${jobMarketLab.console.heading} - ${site.metadata.author}`,
  description: navItem?.description ?? jobMarketLab.console.description,
  robots: {
    index: false,
    follow: false,
  },
};

export default function JobMarketLabConsoleRunsRoute() {
  return <JobMarketConsoleRunsPage />;
}
