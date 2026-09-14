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
import type { ExperienceSection } from "@/data/types";

interface ExperienceListingProps extends ExperienceSection {
  showHeader?: boolean;
  id?: string;
}

export function ExperienceListing({
  heading,
  companies,
  showHeader = true,
  id,
}: ExperienceListingProps) {
  return (
    <Section id={id}>
      <Container>
        <div className="max-w-3xl space-y-12">
          {showHeader && <InteriorHeading>{heading}</InteriorHeading>}

          <MotionRevealGroup className="space-y-14">
            {companies.map((company) => (
              <MotionReveal key={company.name} variant="fade-up" distance="sm">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <Heading size="md" as="h3" className="text-[var(--foreground)]">
                      {company.name}
                    </Heading>
                    <Text variant="muted" size="xs">
                      {company.location}
                    </Text>
                  </div>

                  <div className="space-y-8">
                    {company.roles.map((role) => (
                      <div
                        key={`${company.name}-${role.role}`}
                        className="space-y-2"
                      >
                        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-8">
                          <Heading size="sm" as="h4" className="text-[var(--foreground)]">
                            {role.role}
                          </Heading>
                          <Text variant="muted" size="xs" className="shrink-0 md:text-right">
                            {role.period}
                          </Text>
                        </div>
                        <Text size="sm" className="leading-relaxed">
                          {role.description}
                        </Text>
                      </div>
                    ))}
                  </div>
                </div>
              </MotionReveal>
            ))}
          </MotionRevealGroup>
        </div>
      </Container>
    </Section>
  );
}
