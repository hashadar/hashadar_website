"use client";

import { Heading, Text, Container, Section, SectionBackground, SectionHeader } from "@/components/ui";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { EducationSection } from "@/data/types";

export function EducationListing({ heading, entries }: EducationSection) {
  const prefersReducedMotion = usePrefersReducedMotion();

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
              <motion.div
                key={`${entry.institution}-${entry.qualification}`}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 0.8, delay: index * 0.2, ease: "easeOut" }
                }
                viewport={{ once: true }}
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
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
