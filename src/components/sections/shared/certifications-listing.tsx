"use client";

import {
  Heading,
  Text,
  Container,
  Section,
  MotionReveal,
  MotionRevealGroup,
} from "@/components/ui";
import { InteriorHeading } from "@/components/sections/shared/page-intro";
import type { CertificationsSection } from "@/data/types";

interface CertificationsListingProps extends CertificationsSection {
  embedded?: boolean;
}

export function CertificationsListing({
  heading,
  items,
  embedded = false,
}: CertificationsListingProps) {
  const body = (
    <div className="space-y-12">
      <InteriorHeading>{heading}</InteriorHeading>

      <MotionRevealGroup className="space-y-10">
        {items.map((item) => (
          <MotionReveal key={item.name} variant="fade-up" distance="sm">
            <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-8">
              <div className="space-y-1">
                <Heading size="md" as="h3" className="text-[var(--foreground)]">
                  {item.name}
                </Heading>
                <Text variant="muted" size="xs">
                  {item.issuer}
                </Text>
              </div>
              <Text variant="muted" size="xs" className="shrink-0 md:text-right">
                {item.issued}
              </Text>
            </div>
            {item.credentialUrl ? (
              <p className="mt-3">
                <a
                  href={item.credentialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--mono-500)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                >
                  Verify credential
                </a>
              </p>
            ) : null}
          </MotionReveal>
        ))}
      </MotionRevealGroup>
    </div>
  );

  if (embedded) {
    return body;
  }

  return (
    <Section>
      <Container>
        <div className="max-w-3xl">{body}</div>
      </Container>
    </Section>
  );
}
