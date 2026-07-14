import { Metadata } from 'next';
import { SitePage } from '@/components/layout/site-page';
import { LabsIndexSection } from '@/components/sections/labs/labs-index-section';
import { getPageData, site } from '@/data';

const labs = getPageData('/labs');

export const metadata: Metadata = {
  title: `${labs.heading} - ${site.metadata.author}`,
  description: labs.description,
  openGraph: {
    title: `${labs.heading} - ${site.metadata.author}`,
    description: labs.description,
    url: `${site.metadata.siteUrl}/labs`,
    type: 'website',
  },
};

export default function LabsPage() {
  return (
    <SitePage mainClassName="min-h-screen pt-20">
      <LabsIndexSection />
    </SitePage>
  );
}
