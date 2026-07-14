import { Metadata } from 'next';
import { SitePage } from '@/components/layout/site-page';
import { JobMarketLabConsoleSection } from '@/components/sections/labs/job-market-lab-console-section';
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

export default function JobMarketLabConsolePage() {
  return (
    <SitePage mainClassName="min-h-screen pt-20">
      <JobMarketLabConsoleSection />
    </SitePage>
  );
}
