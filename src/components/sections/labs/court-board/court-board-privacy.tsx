import { Container, Heading, Section, Text } from '@/components/ui';
import { courtBoard, footer } from '@/data';

/**
 * The Court Board privacy notice. A draft for the committee to confirm. It
 * points to LinkedIn for requests and deliberately publishes no email address.
 */
export function CourtBoardPrivacy() {
  const copy = courtBoard.privacy;
  const linkedin = footer.contact.social.linkedin;

  return (
    <Section spacing="sm" className="bg-[var(--cream)]">
      <Container size="sm" className="space-y-10">
        <header className="space-y-3">
          <Heading as="h1" size="lg" className="font-semibold tracking-[-0.04em]" style={{ lineHeight: 1 }}>
            {copy.heading}
          </Heading>
          <Text variant="muted" size="sm" className="max-w-[38rem]">
            {copy.lede}
          </Text>
          <Text variant="muted" size="xs">
            {copy.lastUpdatedLabel}: {copy.lastUpdated}
          </Text>
        </header>

        <section className="space-y-3">
          <Heading as="h2" size="md">
            {copy.contact.heading}
          </Heading>
          {copy.contact.paragraphs.map((paragraph) => (
            <Text key={paragraph} size="sm" className="max-w-[38rem]">
              {paragraph}
            </Text>
          ))}
          <Text size="sm" className="max-w-[38rem]">
            {copy.contact.lead}
            <a
              href={linkedin}
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              {copy.contact.linkLabel}
            </a>
            {copy.contact.trail}
          </Text>
        </section>

        {copy.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <Heading as="h2" size="md">
              {section.heading}
            </Heading>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph} size="sm" className="max-w-[38rem]">
                {paragraph}
              </Text>
            ))}
            {section.items ? (
              <ul className="list-disc space-y-1 pl-5 font-body text-sm max-w-[38rem]">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </Container>
    </Section>
  );
}
