"use client";

import {
  Heading,
  Text,
  Container,
  Section,
  SectionBackground,
  SectionHeader,
  MotionReveal,
} from "@/components/ui";
import type { EducationSection } from "@/data/types";

export function EducationListing({ heading, entries }: EducationSection) {
  return (
    <Section id="education" className="relative overflow-hidden">
      <SectionBackground variant="about-experience" />

      <Container>
        <div className="space-y-16">
          <SectionHeader showRightAccent showBottomAccent>
            {heading}
          </SectionHeader>

          <div className="max-w-4xl mx-auto space-y-12">
            {entries.map((entry, index) => (
              <MotionReveal
                key={`${entry.institution}-${entry.qualification}`}
                variant="slide-in"
                delay={index * 0.2}
                className="relative"
              >
                <div className="relative group">
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-[var(--primary)] opacity-20 transform skew-x-12" />

                  <div className="pl-12 pb-2">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-3">
                      <div className="space-y-1">
                        <Heading size="md" as="h2" className="text-[var(--foreground)]">
                          {entry.institution}
                        </Heading>
                        <Text variant="muted" className="text-sm">
                          {entry.qualification}
                        </Text>
                      </div>
                      <Text variant="muted" className="text-sm font-medium md:text-right shrink-0">
                        {entry.period}
                      </Text>
                    </div>

                    <Text className="leading-relaxed text-sm mb-3">
                      {entry.description}
                    </Text>

                    <div className="w-12 h-px bg-gradient-to-r from-[var(--primary)] to-transparent opacity-20" />
                  </div>
                </div>
              </MotionReveal>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
