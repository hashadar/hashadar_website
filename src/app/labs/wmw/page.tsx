import type { Metadata } from 'next';
import { WmwOverview } from '@/components/sections/labs/wmw/wmw-overview';
import { getPageData, site } from '@/data';

const page = getPageData('/labs/wmw');

export const metadata: Metadata = {
  title: `${page.heading} - ${site.metadata.author}`,
  description: page.description,
  robots: {
    index: false,
    follow: false,
  },
};

export default function WmwPage() {
  return <WmwOverview />;
}
