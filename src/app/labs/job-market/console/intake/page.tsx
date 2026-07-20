import type { Metadata } from 'next';
import { JobMarketConsoleIntakePage } from '@/components/sections/labs/console/job-market-console-intake-page';
import { getPageData, site } from '@/data';

const jobMarketLab = getPageData('/labs/job-market');
const navItem = jobMarketLab.console.nav.items.find((item) => item.id === 'intake');

export const metadata: Metadata = {
  title: `${navItem?.label ?? 'Intake'} - ${jobMarketLab.console.heading} - ${site.metadata.author}`,
  description: navItem?.description ?? jobMarketLab.console.description,
  robots: {
    index: false,
    follow: false,
  },
};

export default function JobMarketLabConsoleIntakeRoute() {
  return <JobMarketConsoleIntakePage />;
}
