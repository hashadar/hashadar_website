"use client";

import { Heading, Text, Container, Section, SectionBackground, SectionHeader } from "@/components/ui";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { CertificationsSection } from "@/data/types";

export function CertificationsListing({ heading, items }: CertificationsSection) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <Section className="relative overflow-hidden">
      <SectionBackground variant="about-experience" />

      <Container>
        <div className="space-y-16">
          <SectionHeader showRightAccent showBottomAccent>
            {heading}
          </SectionHeader>

          <div className="max-w-4xl mx-auto space-y-12">
            {items.map((item, index) => (
              <motion.div
                key={item.name}
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
                        <Heading size="sm" as="h2" className="text-[var(--foreground)]">
                          {item.name}
                        </Heading>
                        <Text variant="muted" className="text-sm">
                          {item.issuer}
                        </Text>
                      </div>
                      <Text variant="muted" className="text-sm font-medium md:text-right shrink-0">
                        {item.issued}
                      </Text>
                    </div>

                    {item.credentialUrl ? (
                      <p className="mb-3">
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
