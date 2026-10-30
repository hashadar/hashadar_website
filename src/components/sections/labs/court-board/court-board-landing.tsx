import Link from 'next/link';
import { Container, Heading, Section, Text } from '@/components/ui';
import { PRIVACY_PATH } from '@/components/sections/labs/court-board/court-board-links';
import { CourtBoardDevPanel } from '@/components/sections/labs/court-board/court-board-dev-panel';
import { courtBoard } from '@/data';
import type { DevInfo } from '@/lib/court-board/server-queries';

export interface CourtBoardLandingProps {
  /** Present only on the in-memory demo store during `next dev`. */
  devInfo: DevInfo | null;
}

export function CourtBoardLanding({ devInfo }: CourtBoardLandingProps) {
  const { lab } = courtBoard;
  return (
    <Section spacing="md" className="bg-[var(--cream)]">
      <Container size="md">
        <Text variant="accent" size="xs" className="mb-3 uppercase tracking-[0.2em]">
          {lab.eyebrow}
        </Text>
        <Heading
          as="h1"
          size="xl"
          className="font-semibold tracking-[-0.05em]"
          style={{ fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', lineHeight: 0.95 }}
        >
          {courtBoard.heading}
        </Heading>
        <Text variant="muted" size="lg" className="mt-4 max-w-[34rem]">
          {lab.lede}
        </Text>

        <Text size="sm" className="mt-8 max-w-[38rem]">
          {lab.intro}
        </Text>

        <Heading as="h2" size="sm" className="mt-10 mb-3">
          {lab.howItWorksHeading}
        </Heading>
        <ol className="list-decimal space-y-2 pl-5 font-body text-[var(--foreground)]">
          {lab.howItWorks.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <Text variant="muted" size="sm" className="mt-8">
          {lab.noLinkNote}
        </Text>
        <Link
          href={PRIVACY_PATH}
          className="mt-2 inline-flex min-h-11 items-center font-body text-sm underline underline-offset-2"
        >
          {courtBoard.privacy.heading}
        </Link>

        {devInfo ? <CourtBoardDevPanel info={devInfo} /> : null}
      </Container>
    </Section>
  );
}
