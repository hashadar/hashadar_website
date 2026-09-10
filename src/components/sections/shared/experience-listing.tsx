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
  type SectionBackgroundVariant,
} from "@/components/ui";
import type { ExperienceSection } from "@/data/types";

interface ExperienceListingProps extends ExperienceSection {
  variant?: SectionBackgroundVariant;
  showHeader?: boolean;
  id?: string;
}

export function ExperienceListing({
  heading,
  companies,
  variant = "marketing",
  showHeader = true,
  id,
}: ExperienceListingProps) {
  return (
    <Section id={id} className="relative overflow-hidden">
      <SectionBackground variant={variant} />

      <Container>
        <div className="space-y-16">
          {showHeader && (
            <SectionHeader showRightAccent showBottomAccent>
              {heading}
            </SectionHeader>
          )}

          <MotionRevealGroup className="mx-auto max-w-4xl space-y-16">
            {companies.map((company) => (
              <MotionReveal key={company.name} variant="slide-in" className="relative">
                <div className="group relative">
                  <div className="absolute top-0 bottom-0 left-0 w-2 skew-x-12 transform bg-[var(--primary)] opacity-20" />

                  <div className="pb-8 pl-12">
                    <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <Heading size="md" as="h2" className="text-[var(--foreground)]">
                          {company.name}
                        </Heading>
                        <Text variant="muted" className="text-sm">
                          {company.location}
                        </Text>
                      </div>

                      <div className="h-px w-12 bg-gradient-to-r from-[var(--primary)] to-transparent opacity-40" />
                    </div>

                    <MotionRevealGroup className="space-y-8">
                      {company.roles.map((role, roleIndex) => (
                        <MotionReveal
                          key={`${company.name}-${role.role}`}
                          variant="fade-up"
                          distance="sm"
                          className="group/role relative"
                        >
                          {roleIndex > 0 && (
                            <div className="absolute top-0 -left-8 h-8 w-px bg-[var(--primary)] opacity-30" />
                          )}

                          <div className="relative space-y-3 pl-8">
                            <div className="absolute top-2 -left-6 h-3 w-3 rotate-45 transform border border-[var(--primary)] opacity-0 transition-opacity duration-300 group-hover/role:opacity-100 motion-reduce:transition-none" />

                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div className="space-y-1">
                                <Heading size="sm" as="h3" className="text-[var(--foreground)]">
                                  {role.role}
                                </Heading>
                              </div>
                              <div className="text-right">
                                <Text variant="muted" className="text-sm font-medium">
                                  {role.period}
                                </Text>
                              </div>
                            </div>

                            <Text className="text-sm leading-relaxed">
                              {role.description}
                            </Text>

                            <div className="h-px w-12 bg-gradient-to-r from-[var(--primary)] to-transparent opacity-20" />
                          </div>
                        </MotionReveal>
                      ))}
                    </MotionRevealGroup>
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
