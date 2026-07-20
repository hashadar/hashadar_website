import type { Metadata } from 'next';
import { JobMarketConsoleFitPage } from '@/components/sections/labs/console/job-market-console-fit-page';
import { getPageData, site } from '@/data';

const jobMarketLab = getPageData('/labs/job-market');
const navItem = jobMarketLab.console.nav.items.find((item) => item.id === 'fit');

export const metadata: Metadata = {
  title: `${navItem?.label ?? 'CV and fit'} - ${jobMarketLab.console.heading} - ${site.metadata.author}`,
  description: navItem?.description ?? jobMarketLab.console.description,
  robots: {
    index: false,
    follow: false,
  },
};

export default function JobMarketLabConsoleFitRoute() {
  return <JobMarketConsoleFitPage />;
}
