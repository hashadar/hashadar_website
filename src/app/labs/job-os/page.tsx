import type { Metadata } from 'next';
import { JobOsOverview } from '@/components/sections/labs/job-os/job-os-overview';
import { getPageData, site } from '@/data';

const page = getPageData('/labs/job-os');

export const metadata: Metadata = {
  title: `${page.heading} - ${site.metadata.author}`,
  description: page.description,
  robots: {
    index: false,
    follow: false,
  },
};

export default function JobOsPage() {
  return <JobOsOverview />;
}
