import { Metadata } from 'next';
import { SitePage } from '@/components/layout/site-page';
import { JobMarketLabSection } from '@/components/sections/labs/job-market-lab-section';
import { getPageData, site } from '@/data';
import { ensureSiteAmplifyFromOutputs } from '@/lib/ensure-site-amplify-from-outputs';
import { getPublishedJobMarketSnapshot } from '@/lib/job-market-lab';

const jobMarketLab = getPageData('/labs/job-market');

/** Live Amplify published-snapshot fetch must not run at static build time. */
export const dynamic = 'force-dynamic';

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

/**
 * Public results surface. Keeps SitePage (header + footer) so site brand stays
 * lightly present, while JobMarketLabSection uses a denser full-bleed lab shell
 * instead of the marketing Section essay stack.
 */
export default async function JobMarketLabPage() {
  ensureSiteAmplifyFromOutputs();
  const publication = await getPublishedJobMarketSnapshot();

  return (
    <SitePage mainClassName="min-h-screen pt-16 md:pt-20">
      <JobMarketLabSection publication={publication} />
    </SitePage>
  );
}
