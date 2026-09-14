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
import type { EducationSection } from "@/data/types";

interface EducationListingProps extends EducationSection {
  embedded?: boolean;
}

export function EducationListing({
  heading,
  entries,
  embedded = false,
}: EducationListingProps) {
  const body = (
    <div className="space-y-12">
      <InteriorHeading>{heading}</InteriorHeading>

      <MotionRevealGroup className="space-y-10">
        {entries.map((entry) => (
          <MotionReveal
            key={`${entry.institution}-${entry.qualification}`}
            variant="fade-up"
            distance="sm"
          >
            <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-8">
              <div className="space-y-1">
                <Heading size="md" as="h3" className="text-[var(--foreground)]">
                  {entry.institution}
                </Heading>
                <Text variant="muted" size="xs">
                  {entry.qualification}
                </Text>
              </div>
              <Text variant="muted" size="xs" className="shrink-0 md:text-right">
                {entry.period}
              </Text>
            </div>
            {entry.description ? (
              <Text size="sm" className="mt-3 leading-relaxed">
                {entry.description}
              </Text>
            ) : null}
          </MotionReveal>
        ))}
      </MotionRevealGroup>
    </div>
  );

  if (embedded) {
    return (
      <div id="education">
        {body}
      </div>
    );
  }

  return (
    <Section id="education">
      <Container>
        <div className="max-w-3xl">{body}</div>
      </Container>
    </Section>
  );
}
