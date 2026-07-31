import { Metadata } from 'next';
import { SitePage } from '@/components/layout/site-page';
import { AdminSection } from '@/components/sections/admin/admin-section';
import { getPageData, site } from '@/data';

const admin = getPageData('/admin');

export const metadata: Metadata = {
  title: `${admin.heading} - ${site.metadata.author}`,
  description: admin.description,
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <SitePage mainClassName="min-h-screen pt-20">
      <AdminSection />
    </SitePage>
  );
}
