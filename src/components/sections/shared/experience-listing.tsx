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
import type { ExperienceSection } from "@/data/types";

interface ExperienceListingProps extends ExperienceSection {
  variant?: "about-experience" | "photography";
  showHeader?: boolean;
  id?: string;
}

export function ExperienceListing({
  heading,
  companies,
  variant = "about-experience",
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

          <div className="max-w-4xl mx-auto space-y-16">
            {companies.map((company, companyIndex) => (
              <MotionReveal
                key={company.name}
                variant="slide-in"
                delay={companyIndex * 0.3}
                className="relative"
              >
                <div className="relative group">
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-[var(--primary)] opacity-20 transform skew-x-12" />

                  <div className="pl-12 pb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
                      <div className="space-y-1">
                        <Heading size="md" as="h2" className="text-[var(--foreground)]">
                          {company.name}
                        </Heading>
                        <Text variant="muted" className="text-sm">
                          {company.location}
                        </Text>
                      </div>

                      <div className="w-12 h-px bg-gradient-to-r from-[var(--primary)] to-transparent opacity-40" />
                    </div>

                    <div className="space-y-8">
                      {company.roles.map((role, roleIndex) => (
                        <MotionReveal
                          key={`${company.name}-${role.role}`}
                          variant="fade-up"
                          distance="sm"
                          delay={companyIndex * 0.3 + roleIndex * 0.15}
                          className="relative group/role"
                        >
                          {roleIndex > 0 && (
                            <div className="absolute -left-8 top-0 w-px h-8 bg-[var(--primary)] opacity-30" />
                          )}

                          <div className="pl-8 space-y-3 relative">
                            <div className="absolute -left-6 top-2 w-3 h-3 border border-[var(--primary)] transform rotate-45 opacity-0 group-hover/role:opacity-100 transition-opacity duration-300" />

                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
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

                            <Text className="leading-relaxed text-sm">
                              {role.description}
                            </Text>

                            <div className="w-12 h-px bg-gradient-to-r from-[var(--primary)] to-transparent opacity-20" />
                          </div>
                        </MotionReveal>
                      ))}
                    </div>
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
