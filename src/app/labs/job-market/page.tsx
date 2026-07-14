import { Metadata } from 'next';
import { SitePage } from '@/components/layout/site-page';
import { JobMarketLabSection } from '@/components/sections/labs/job-market-lab-section';
import { getPageData, site } from '@/data';
import { getPublishedJobMarketSnapshot } from '@/lib/job-market-lab';

const jobMarketLab = getPageData('/labs/job-market');

export const metadata: Metadata = {
  title: `${jobMarketLab.heading} - ${site.metadata.author}`,
  description: jobMarketLab.description,
  openGraph: {
    title: `${jobMarketLab.heading} - ${site.metadata.author}`,
    description: jobMarketLab.description,
    url: `${site.metadata.siteUrl}/labs/job-market`,
    type: 'website',
  },
};

export default async function JobMarketLabPage() {
  const publication = await getPublishedJobMarketSnapshot();

  return (
    <SitePage mainClassName="min-h-screen pt-20">
      <JobMarketLabSection publication={publication} />
    </SitePage>
  );
}
