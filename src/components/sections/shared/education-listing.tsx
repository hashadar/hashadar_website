"use client";

import {
  Heading,
  Text,
  Container,
  Section,
  SectionBackground,
  SectionHeader,
  MotionReveal,
  MotionRevealGroup,
} from "@/components/ui";
import type { EducationSection } from "@/data/types";

export function EducationListing({ heading, entries }: EducationSection) {
  return (
    <Section id="education" className="relative overflow-hidden">
      <SectionBackground variant="marketing" />

      <Container>
        <div className="space-y-16">
          <SectionHeader showRightAccent showBottomAccent>
            {heading}
          </SectionHeader>

          <MotionRevealGroup className="mx-auto max-w-4xl space-y-12">
            {entries.map((entry) => (
              <MotionReveal
                key={`${entry.institution}-${entry.qualification}`}
                variant="slide-in"
                className="relative"
              >
                <div className="group relative">
                  <div className="absolute top-0 bottom-0 left-0 w-2 skew-x-12 transform bg-[var(--primary)] opacity-20" />

                  <div className="pb-2 pl-12">
                    <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <Heading size="md" as="h2" className="text-[var(--foreground)]">
                          {entry.institution}
                        </Heading>
                        <Text variant="muted" className="text-sm">
                          {entry.qualification}
                        </Text>
                      </div>
                      <Text variant="muted" className="shrink-0 text-sm font-medium md:text-right">
                        {entry.period}
                      </Text>
                    </div>

                    <Text className="mb-3 text-sm leading-relaxed">
                      {entry.description}
                    </Text>

                    <div className="h-px w-12 bg-gradient-to-r from-[var(--primary)] to-transparent opacity-20" />
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
