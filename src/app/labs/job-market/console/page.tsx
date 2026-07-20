import type { Metadata } from 'next';
import { JobMarketConsoleOverview } from '@/components/sections/labs/console/job-market-console-overview';
import { getPageData, site } from '@/data';

const jobMarketLab = getPageData('/labs/job-market');

export const metadata: Metadata = {
  title: `${jobMarketLab.console.heading} - ${site.metadata.author}`,
  description: jobMarketLab.console.description,
  openGraph: {
    title: `${jobMarketLab.console.heading} - ${site.metadata.author}`,
    description: jobMarketLab.console.description,
    url: `${site.metadata.siteUrl}/labs/job-market/console`,
    type: 'website',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function JobMarketLabConsoleOverviewPage() {
  return <JobMarketConsoleOverview />;
}
