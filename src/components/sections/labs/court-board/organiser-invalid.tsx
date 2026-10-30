import { Container, Heading, Section, Text } from '@/components/ui';
import { courtBoard } from '@/data';

/** Shown for a missing, wrong or rotated-away Organiser link. Says nothing about why. */
export function OrganiserInvalid() {
  return (
    <Section spacing="md" className="bg-[var(--cream)]">
      <Container size="sm">
        <Heading as="h1" size="md" className="font-semibold tracking-[-0.03em]">
          {courtBoard.organiser.invalidHeading}
        </Heading>
        <Text variant="muted" size="sm" className="mt-3">
          {courtBoard.organiser.invalidBody}
        </Text>
      </Container>
    </Section>
  );
}
