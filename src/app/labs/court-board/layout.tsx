import type { Metadata } from 'next';
import { SitePage } from '@/components/layout/site-page';
import { courtBoard, site } from '@/data';

// Court Board is a public Lab but is never indexed: Session and Organiser
// links are capability URLs. Sitemap and robots.txt are deliberately unchanged.
export const metadata: Metadata = {
  title: `${courtBoard.heading} - ${site.metadata.author}`,
  description: courtBoard.description,
  robots: { index: false, follow: false },
  // Phones turn bare numbers into tel: links before React hydrates, which breaks
  // hydration of the phone numbers shown on these pages.
  formatDetection: { telephone: false, email: false, address: false },
};

export default function CourtBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SitePage mainClassName="min-h-screen pt-20">{children}</SitePage>;
}
