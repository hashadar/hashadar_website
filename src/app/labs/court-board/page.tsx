import type { Metadata } from 'next';
import { CourtBoardLanding } from '@/components/sections/labs/court-board/court-board-landing';
import { courtBoard, site } from '@/data';
import { getDevInfo } from '@/lib/court-board/server-queries';

export const metadata: Metadata = {
  title: `${courtBoard.heading} - ${site.metadata.author}`,
  description: courtBoard.description,
  robots: { index: false, follow: false },
};

export default async function CourtBoardPage() {
  const devInfo = await getDevInfo();
  return <CourtBoardLanding devInfo={devInfo} />;
}
