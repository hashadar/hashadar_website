import { Metadata } from 'next';
import { SitePage } from '@/components/layout/site-page';
import { LoginSection } from '@/components/sections/login/login-section';
import { getPageData, site } from '@/data';

const login = getPageData('/login');

export const metadata: Metadata = {
  title: `${login.heading} - ${site.metadata.author}`,
  description: login.description,
  openGraph: {
    title: `${login.heading} - ${site.metadata.author}`,
    description: login.description,
    url: `${site.metadata.siteUrl}/login`,
    type: 'website',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <SitePage mainClassName="min-h-screen pt-20">
      <LoginSection />
    </SitePage>
  );
}
