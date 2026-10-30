import type { Metadata } from 'next';
import { CourtBoardPrivacy } from '@/components/sections/labs/court-board/court-board-privacy';
import { courtBoard, site } from '@/data';

export const metadata: Metadata = {
  title: `${courtBoard.privacy.heading} - ${courtBoard.heading} - ${site.metadata.author}`,
  description: courtBoard.privacy.lede,
  robots: { index: false, follow: false },
};

export default function CourtBoardPrivacyPage() {
  return <CourtBoardPrivacy />;
}
