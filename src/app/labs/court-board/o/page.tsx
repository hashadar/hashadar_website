import type { Metadata } from 'next';
import { OrganiserBoard } from '@/components/sections/labs/court-board/organiser-board';
import { OrganiserInvalid } from '@/components/sections/labs/court-board/organiser-invalid';
import { OrganiserLinkOpener } from '@/components/sections/labs/court-board/organiser-link-opener';
import { courtBoard, site } from '@/data';
import { loadOrganiserOverview } from '@/lib/court-board/server-queries';
import { isSessionId } from '@/lib/court-board/validation';

// Read per request (it reads the Organiser cookie), never cached or indexed.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Organiser - ${courtBoard.heading} - ${site.metadata.author}`,
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function CourtBoardOrganiserPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.session) ? params.session[0] : params.session;
  const overview = await loadOrganiserOverview(isSessionId(raw) ? raw : undefined);

  // A link's token arrives after `#`, which only the browser can read.
  if (!overview) return <OrganiserLinkOpener fallback={<OrganiserInvalid />} />;
  return (
    <>
      <OrganiserLinkOpener />
      <OrganiserBoard overview={overview} />
    </>
  );
}
