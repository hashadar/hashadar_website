import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SessionPage } from '@/components/sections/labs/court-board/session-page';
import { courtBoard, site } from '@/data';
import { loadSessionView } from '@/lib/court-board/server-queries';

// The live list is rendered per request; Session links are capability URLs.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${courtBoard.heading} - ${site.metadata.author}`,
  description: courtBoard.description,
  robots: { index: false, follow: false },
};

export default async function CourtBoardSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const view = await loadSessionView(sessionId);
  if (!view) notFound();
  return <SessionPage view={view} />;
}
