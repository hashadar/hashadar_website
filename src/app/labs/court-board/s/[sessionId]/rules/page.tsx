import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CourtBoardRules } from '@/components/sections/labs/court-board/court-board-rules';
import { courtBoard, site } from '@/data';
import { loadRulesView } from '@/lib/court-board/rules-queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${courtBoard.rules.heading} - ${site.metadata.author}`,
  description: courtBoard.description,
  robots: { index: false, follow: false },
};

export default async function CourtBoardRulesPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const view = await loadRulesView(sessionId);
  if (!view) notFound();
  return <CourtBoardRules view={view} sessionId={sessionId} />;
}
