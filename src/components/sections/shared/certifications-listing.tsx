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
import type { CertificationsSection } from "@/data/types";

export function CertificationsListing({ heading, items }: CertificationsSection) {
  return (
    <Section className="relative overflow-hidden">
      <SectionBackground variant="marketing" />

      <Container>
        <div className="space-y-16">
          <SectionHeader showRightAccent showBottomAccent>
            {heading}
          </SectionHeader>

          <MotionRevealGroup className="mx-auto max-w-4xl space-y-12">
            {items.map((item) => (
              <MotionReveal key={item.name} variant="slide-in" className="relative">
                <div className="group relative">
                  <div className="absolute top-0 bottom-0 left-0 w-2 skew-x-12 transform bg-[var(--primary)] opacity-20" />

                  <div className="pb-2 pl-12">
                    <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <Heading size="sm" as="h2" className="text-[var(--foreground)]">
                          {item.name}
                        </Heading>
                        <Text variant="muted" className="text-sm">
                          {item.issuer}
                        </Text>
                      </div>
                      <Text variant="muted" className="shrink-0 text-sm font-medium md:text-right">
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
